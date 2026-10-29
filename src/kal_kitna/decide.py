"""Turn forecasts into order quantities, and measure the result in rupees."""

import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from kal_kitna.data import load_params
from kal_kitna.evaluation import time_split
from kal_kitna.newsvendor import critical_ratio
from kal_kitna.train import feature_columns

FEATURES = Path("data/features/features.parquet")
MODEL = Path("models/model.txt")
REPORTS = Path("reports")


def predict(booster: lgb.Booster, df: pd.DataFrame) -> pd.DataFrame:
    """Add a non-negative 'forecast' column using the trained model."""
    out = df.copy()
    out["forecast"] = np.clip(booster.predict(df[feature_columns(df)]), 0, None)
    return out


def family_ratios(costs: dict) -> dict[str, float]:
    """Critical ratio per family, from the cost assumptions in params.yaml."""
    goodwill = costs["goodwill_pct"]
    return {
        fam: critical_ratio(v["cost"], v["price"], goodwill)
        for fam, v in costs["families"].items()
    }


def fit_multipliers(
    calib: pd.DataFrame, ratios: dict[str, float], min_forecast: float = 1.0
) -> dict[str, float]:
    """For each family, the forecast multiplier that covers demand
    with probability equal to that family's critical ratio."""
    usable = calib[calib["forecast"] >= min_forecast]
    multipliers = {}
    for fam, q in ratios.items():
        rows = usable[usable["family"] == fam]
        multipliers[fam] = float((rows["sales"] / rows["forecast"]).quantile(q))
    return multipliers


def policy_orders(df: pd.DataFrame, multipliers: dict[str, float]) -> dict[str, pd.Series]:
    """Three ways to decide tomorrow's order."""
    mult = df["family"].astype(str).map(multipliers)
    return {
        "naive_last_week": df["lag_7"].fillna(df["mean_28"]).fillna(0),
        "forecast_only": df["forecast"],
        "kal_kitna": df["forecast"] * mult,
    }


def simulate(df: pd.DataFrame, orders: pd.Series, costs: dict) -> dict[str, float]:
    """Play out the orders against real demand and count the money."""
    fam = df["family"].astype(str)
    cost = fam.map(lambda f: costs["families"][f]["cost"])
    price = fam.map(lambda f: costs["families"][f]["price"])
    goodwill = costs["goodwill_pct"]
    actual = df["sales"]

    sold = np.minimum(orders, actual)
    leftover = (orders - actual).clip(lower=0)
    short = (actual - orders).clip(lower=0)
    waste = leftover * cost
    stockout = short * ((price - cost) + goodwill * price)
    return {
        "profit_rs": round(float((sold * price - orders * cost).sum())),
        "waste_rs": round(float(waste.sum())),
        "stockout_rs": round(float(stockout.sum())),
        "mistake_cost_rs": round(float((waste + stockout).sum())),
        "fill_rate": round(float(sold.sum() / actual.sum()), 4),
    }


def main() -> None:
    params = load_params()
    split, costs = params["split"], params["costs"]
    df = pd.read_parquet(FEATURES)
    _, valid, test = time_split(df, split["valid_start"], split["test_start"])

    booster = lgb.Booster(model_file=str(MODEL))
    valid, test = predict(booster, valid), predict(booster, test)
    multipliers = fit_multipliers(valid, family_ratios(costs))

    results = {
        name: simulate(test, orders, costs)
        for name, orders in policy_orders(test, multipliers).items()
    }
    naive, kk = results["naive_last_week"], results["kal_kitna"]
    n_stores = test["store_nbr"].nunique()
    headline = {
        "waste_cut_pct": round(100 * (1 - kk["waste_rs"] / naive["waste_rs"]), 1),
        "mistake_cost_cut_pct": round(
            100 * (1 - kk["mistake_cost_rs"] / naive["mistake_cost_rs"]), 1
        ),
        "profit_gain_per_store_rs": round((kk["profit_rs"] - naive["profit_rs"]) / n_stores),
    }

    REPORTS.mkdir(exist_ok=True)
    report = {
        "multipliers": {f: round(m, 3) for f, m in multipliers.items()},
        "policies": results,
        "headline": headline,
    }
    (REPORTS / "business.json").write_text(json.dumps(report, indent=2))

    print(f"{'policy':<18}{'profit Rs':>14}{'waste Rs':>12}{'stockout Rs':>13}{'fill rate':>11}")
    for name, r in results.items():
        print(
            f"{name:<18}{r['profit_rs']:>14,}{r['waste_rs']:>12,}"
            f"{r['stockout_rs']:>13,}{r['fill_rate']:>11.1%}"
        )
    print(f"\nKal Kitna vs naive over 4 test weeks, {n_stores} stores:")
    print(f"  waste cut {headline['waste_cut_pct']}%, total mistake cost cut {headline['mistake_cost_cut_pct']}%")
    print(f"  profit gain per store: Rs {headline['profit_gain_per_store_rs']:,}")


if __name__ == "__main__":
    main()