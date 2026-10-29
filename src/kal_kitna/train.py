"""Train LightGBM on the features, track the run in MLflow, and save the model."""

import json
from pathlib import Path

import lightgbm as lgb
import mlflow
import numpy as np
import pandas as pd

from kal_kitna.data import load_params
from kal_kitna.evaluation import bias, time_split, wape

FEATURES = Path("data/features/features.parquet")
MODELS = Path("models")
REPORTS = Path("reports")
TARGET = "sales"
NOT_FEATURES = ["date", TARGET]
TRACKING_URI = "sqlite:///mlflow.db"


def feature_columns(df: pd.DataFrame) -> list[str]:
    """Everything except the date and the answer."""
    return [c for c in df.columns if c not in NOT_FEATURES]


def train_model(train: pd.DataFrame, valid: pd.DataFrame, p: dict) -> lgb.LGBMRegressor:
    cols = feature_columns(train)
    model = lgb.LGBMRegressor(
        objective=p["objective"],
        learning_rate=p["learning_rate"],
        num_leaves=p["num_leaves"],
        min_child_samples=p["min_child_samples"],
        n_estimators=p["n_estimators"],
        random_state=p["seed"],
        importance_type="gain",
        verbose=-1,
    )
    model.fit(
        train[cols],
        train[TARGET],
        eval_X=valid[cols],
        eval_y=valid[TARGET],
        callbacks=[lgb.early_stopping(p["early_stopping_rounds"], verbose=False)],
    )
    return model


def score(model: lgb.LGBMRegressor, df: pd.DataFrame) -> dict[str, float]:
    pred = np.clip(model.predict(df[feature_columns(df)]), 0, None)
    return {"wape": round(wape(df[TARGET], pred), 4), "bias": round(bias(df[TARGET], pred), 4)}


def main() -> None:
    params = load_params()
    split, model_params = params["split"], params["model"]
    df = pd.read_parquet(FEATURES)
    train, valid, test = time_split(df, split["valid_start"], split["test_start"])

    mlflow.set_tracking_uri(TRACKING_URI)
    mlflow.set_experiment("kal-kitna")
    with mlflow.start_run():
        model = train_model(train, valid, model_params)
        metrics = {f"valid_{k}": v for k, v in score(model, valid).items()}
        metrics |= {f"test_{k}": v for k, v in score(model, test).items()}
        metrics["best_iteration"] = int(model.best_iteration_)

        MODELS.mkdir(exist_ok=True)
        model.booster_.save_model(str(MODELS / "model.txt"))
        importance = dict(zip(feature_columns(train), model.feature_importances_.tolist()))
        importance = dict(sorted(importance.items(), key=lambda kv: -kv[1]))
        (REPORTS / "metrics.json").write_text(json.dumps(metrics, indent=2))
        (REPORTS / "importance.json").write_text(json.dumps(importance, indent=2))

        mlflow.log_params(model_params | params["features"])
        mlflow.log_metrics(metrics)
        mlflow.log_artifact(str(MODELS / "model.txt"))
        mlflow.log_artifact(str(REPORTS / "importance.json"))

    baseline = json.loads((REPORTS / "baseline.json").read_text())
    best_base = min(baseline["last_week_valid_wape"], baseline["four_week_avg_valid_wape"])
    gain = (best_base - metrics["valid_wape"]) / best_base
    print(f"Best baseline valid WAPE: {best_base}")
    print(f"LightGBM valid WAPE:      {metrics['valid_wape']}  (bias {metrics['valid_bias']})")
    print(f"Improvement over baseline: {gain:.1%}  |  trees used: {metrics['best_iteration']}")


if __name__ == "__main__":
    main()