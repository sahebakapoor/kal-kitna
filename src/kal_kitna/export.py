"""Bundle exactly what the API needs: the model, recent features, and the ordering policy."""

import json
import shutil
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from kal_kitna.data import load_params
from kal_kitna.decide import FEATURES, MODEL, predict
from kal_kitna.evaluation import time_split

SERVING = Path("models/serving")
LEVELS = [round(float(q), 2) for q in np.arange(0.01, 1.0, 0.01)]  # 0.01 ... 0.99


def error_quantiles(
    calib: pd.DataFrame, min_forecast: float = 1.0
) -> dict[str, list[float]]:
    """For each family, actual / forecast at every percentile from 1% to 99%."""
    usable = calib[calib["forecast"] >= min_forecast]
    ratio = usable["sales"] / usable["forecast"]
    table = {}
    for fam, values in ratio.groupby(usable["family"].astype(str)):
        table[fam] = [round(float(v), 4) for v in values.quantile(LEVELS)]
    return table


def main() -> None:
    params = load_params()
    split = params["split"]
    df = pd.read_parquet(FEATURES)
    _, valid, test = time_split(df, split["valid_start"], split["test_start"])

    booster = lgb.Booster(model_file=str(MODEL))
    valid = predict(booster, valid)

    if SERVING.exists():
        shutil.rmtree(SERVING)  # start clean so no stale file sneaks into the bundle
    SERVING.mkdir(parents=True)

    shutil.copy(MODEL, SERVING / "model.txt")
    test.to_parquet(SERVING / "features.parquet", index=False)
    policy = {
        "quantile_levels": LEVELS,
        "error_quantiles": error_quantiles(valid),
        "costs": params["costs"],
        "model_trees": booster.num_trees(),
    }
    (SERVING / "policy.json").write_text(json.dumps(policy, indent=2))
    print(
        f"Serving bundle: {len(test):,} feature rows, {policy['model_trees']} trees -> {SERVING}"
    )


if __name__ == "__main__":
    main()
