"""Aggregate the real test-window results for the Lab dashboards.

Only summaries leave this stage: scores per product, per store and per weekday,
chain-wide daily totals and an error histogram. No individual row of the dataset
is written, which keeps the public Lab within the competition rules.
"""

import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from kal_kitna.baseline import baseline_predictions
from kal_kitna.data import load_params
from kal_kitna.decide import FEATURES, MODEL, predict
from kal_kitna.evaluation import bias, time_split, wape

OUT = Path("models/lab.json")
REPORTS = Path("reports")
METHODS = {"model": "forecast", "last_week": "last_week", "four_week": "four_week"}
ERROR_BINS = [0, 0.05, 0.10, 0.20, 0.30, 0.50, np.inf]
ERROR_LABELS = ["<5%", "5–10%", "10–20%", "20–30%", "30–50%", "50%+"]


def scores(df: pd.DataFrame) -> dict:
    return {
        name: {
            "wape": round(wape(df["sales"], df[col]), 4),
            "bias": round(bias(df["sales"], df[col]), 4),
        }
        for name, col in METHODS.items()
    }


def daily_totals(df: pd.DataFrame) -> list[dict]:
    out = []
    for day, g in df.groupby("date"):
        out.append(
            {
                "date": str(day.date()),
                "actual": round(float(g["sales"].sum())),
                **{name: round(float(g[col].sum())) for name, col in METHODS.items()},
            }
        )
    return out


def error_shares(df: pd.DataFrame) -> dict:
    """Share of rows whose absolute percentage error falls in each bin (rows with real sales only)."""
    real = df[df["sales"] >= 1]
    shares = {}
    for name, col in METHODS.items():
        pct = (real[col] - real["sales"]).abs() / real["sales"]
        counts = pd.cut(pct, ERROR_BINS, labels=ERROR_LABELS, right=False).value_counts(
            sort=False
        )
        shares[name] = [round(float(c) / len(real), 4) for c in counts]
    return {"bins": ERROR_LABELS, "shares": shares}


def read_json(path: Path) -> dict | None:
    return json.loads(path.read_text()) if path.exists() else None


def build_report(test: pd.DataFrame, params: dict) -> dict:
    family = test["family"].astype(str)
    store = test["store_nbr"].astype(int)
    weekday = test["date"].dt.dayofweek
    by_store = []
    for s, g in test.groupby(store):
        by_store.append(
            {
                "store": int(s),
                "model": round(wape(g["sales"], g["forecast"]), 4),
                "last_week": round(wape(g["sales"], g["last_week"]), 4),
            }
        )
    importance = read_json(REPORTS / "importance.json") or {}
    top = sorted(importance.items(), key=lambda kv: -kv[1])[:10]
    total = sum(v for _, v in top) or 1
    return {
        "window": {
            "start": str(test["date"].min().date()),
            "end": str(test["date"].max().date()),
            "rows": int(len(test)),
            "stores": int(store.nunique()),
            "families": int(family.nunique()),
        },
        "overall": scores(test),
        "by_family": {
            f: {**scores(g), "units": round(float(g["sales"].sum()))}
            for f, g in test.groupby(family)
        },
        "by_store": by_store,
        "by_weekday": [
            {
                "day": int(d),
                **{n: round(wape(g["sales"], g[c]), 4) for n, c in METHODS.items()},
            }
            for d, g in test.groupby(weekday)
        ],
        "daily": daily_totals(test),
        "daily_by_family": {f: daily_totals(g) for f, g in test.groupby(family)},
        "errors": error_shares(test),
        "importance": [{"feature": k, "share": round(v / total, 4)} for k, v in top],
        "business": read_json(REPORTS / "business.json"),
        "model_params": params.get("model", {}),
    }


def main() -> None:
    params = load_params()
    split = params["split"]
    df = pd.read_parquet(FEATURES)
    _, _, test = time_split(df, split["valid_start"], split["test_start"])
    test = predict(lgb.Booster(model_file=str(MODEL)), test)
    base = baseline_predictions(test)
    test = test.assign(
        last_week=base["last_week"].to_numpy(),
        four_week=base["four_week_avg"].to_numpy(),
    )

    report = build_report(test, params)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=1))
    o = report["overall"]
    print(f"Lab report: {report['window']['rows']:,} test rows summarised -> {OUT}")
    print(f"  model WAPE {o['model']['wape']} vs last week {o['last_week']['wape']}")


if __name__ == "__main__":
    main()
