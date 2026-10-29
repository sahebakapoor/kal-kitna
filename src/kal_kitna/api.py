"""Kal Kitna web API: forecasts and recommended orders for perishables."""

import json
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date as Date
from pathlib import Path
from typing import Annotated

import lightgbm as lgb
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, model_validator

from kal_kitna.newsvendor import critical_ratio
from kal_kitna.train import feature_columns

SERVING = Path("models/serving")


@dataclass
class Artifacts:
    """Everything the API needs, loaded once at startup."""

    features: pd.DataFrame  # one row per store, family and date
    policy: dict  # quantile levels, error quantiles per family, default costs
    predict: Callable[[pd.DataFrame], np.ndarray]
    model_trees: int


def load_artifacts(folder: Path = SERVING) -> Artifacts:
    booster = lgb.Booster(model_file=str(folder / "model.txt"))
    policy = json.loads((folder / "policy.json").read_text())
    return Artifacts(
        features=pd.read_parquet(folder / "features.parquet"),
        policy=policy,
        predict=lambda df: booster.predict(df[feature_columns(df)]),
        model_trees=policy["model_trees"],
    )


def multiplier_for(policy: dict, family: str, ratio: float) -> float:
    """Read the family's error spread at the given critical ratio, interpolating between percentiles."""
    return float(
        np.interp(ratio, policy["quantile_levels"], policy["error_quantiles"][family])
    )


class OrderRequest(BaseModel):
    store_nbr: int = Field(gt=0)
    family: str
    date: Date
    cost: float = Field(gt=0, description="What the shop pays per unit, in rupees")
    price: float = Field(gt=0, description="What the shop sells it for, in rupees")
    goodwill_pct: float = Field(default=0.2, ge=0, le=2)

    @model_validator(mode="after")
    def price_above_cost(self):
        if self.cost >= self.price:
            raise ValueError("price must be higher than cost")
        return self


class Recommendation(BaseModel):
    store_nbr: int
    family: str
    date: Date
    forecast: float
    critical_ratio: float
    recommended_order: float
    actual: float | None


def create_app(artifacts: Artifacts | None = None) -> FastAPI:
    art = artifacts or load_artifacts()
    feats = art.features
    families = feats["family"].astype(str)
    # (store, family, date) -> row position, built once so every lookup is instant
    index = {
        (int(s), f, d.date()): i
        for i, (s, f, d) in enumerate(zip(feats["store_nbr"], families, feats["date"]))
    }

    app = FastAPI(
        title="Kal Kitna",
        description="How much perishable stock to order tomorrow.",
        version="1.0.0",
    )

    def recommend(
        store: int, family: str, day: Date, cost: float, price: float, goodwill: float
    ):
        if family not in art.policy["error_quantiles"]:
            raise HTTPException(status_code=404, detail=f"Unknown family: {family}")
        key = (store, family, day)
        if key not in index:
            raise HTTPException(
                status_code=404, detail=f"No data for store {store}, {family}, {day}"
            )
        row = feats.iloc[[index[key]]]
        forecast = max(float(art.predict(row)[0]), 0.0)
        ratio = critical_ratio(cost, price, goodwill)
        order = forecast * multiplier_for(art.policy, family, ratio)
        actual = row["sales"].iloc[0]
        return Recommendation(
            store_nbr=store,
            family=family,
            date=day,
            forecast=round(forecast, 1),
            critical_ratio=round(ratio, 3),
            recommended_order=round(order, 1),
            actual=None if pd.isna(actual) else round(float(actual), 1),
        )

    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse(url="/docs")

    @app.get("/health")
    def health():
        return {"status": "ok", "model_trees": art.model_trees}

    @app.get("/options")
    def options():
        return {
            "stores": sorted(int(s) for s in feats["store_nbr"].unique()),
            "families": sorted(families.unique().tolist()),
            "first_date": str(feats["date"].min().date()),
            "last_date": str(feats["date"].max().date()),
        }

    @app.get("/forecast", response_model=Recommendation)
    def forecast(store_nbr: Annotated[int, Query(gt=0)], family: str, date: Date):
        costs = art.policy["costs"]
        if family not in costs["families"]:
            raise HTTPException(status_code=404, detail=f"Unknown family: {family}")
        c = costs["families"][family]
        return recommend(
            store_nbr, family, date, c["cost"], c["price"], costs["goodwill_pct"]
        )

    @app.post("/order", response_model=Recommendation)
    def order(req: OrderRequest):
        return recommend(
            req.store_nbr, req.family, req.date, req.cost, req.price, req.goodwill_pct
        )

    return app
