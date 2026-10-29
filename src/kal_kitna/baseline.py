"""Zero-effort forecasts. The model must beat these to earn its keep."""

import json
from pathlib import Path

import pandas as pd

from kal_kitna.data import load_params
from kal_kitna.evaluation import bias, time_split, wape

FEATURES = Path("data/features/features.parquet")
REPORTS = Path("reports")


def baseline_predictions(df: pd.DataFrame) -> dict[str, pd.Series]:
    return {
        "last_week": df["lag_7"].fillna(df["mean_28"]).fillna(0),
        "four_week_avg": df["mean_28"].fillna(0),
    }


def main() -> None:
    split = load_params()["split"]
    df = pd.read_parquet(FEATURES)
    _, valid, test = time_split(df, split["valid_start"], split["test_start"])

    results = {}
    for part_name, part in [("valid", valid), ("test", test)]:
        for method, pred in baseline_predictions(part).items():
            results[f"{method}_{part_name}_wape"] = round(wape(part["sales"], pred), 4)
            results[f"{method}_{part_name}_bias"] = round(bias(part["sales"], pred), 4)

    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "baseline.json").write_text(json.dumps(results, indent=2))
    for key, value in results.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
