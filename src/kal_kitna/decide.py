"""Turn forecasts into order quantities, and measure the result in rupees."""

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


def main() -> None:
    params = load_params()
    split = params["split"]
    df = pd.read_parquet(FEATURES)
    _, valid, _ = time_split(df, split["valid_start"], split["test_start"])

    booster = lgb.Booster(model_file=str(MODEL))
    valid = predict(booster, valid)
    ratios = family_ratios(params["costs"])
    multipliers = fit_multipliers(valid, ratios)

    usable = valid[valid["forecast"] >= 1]
    rel = usable["sales"] / usable["forecast"]
    spread = rel.groupby(usable["family"], observed=True).quantile([0.2, 0.5, 0.8]).unstack()
    print("How actual sales compare to the forecast (actual / forecast):")
    print(spread.round(2))
    print(f"\n{'family':<14}{'ratio':>7}{'multiplier':>12}")
    for fam in ratios:
        print(f"{fam:<14}{ratios[fam]:>7.3f}{multipliers[fam]:>12.3f}")


if __name__ == "__main__":
    main()