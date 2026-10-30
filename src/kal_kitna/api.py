"""Kal Kitna web API: forecasts and recommended orders for perishables."""

import json
import os
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date as Date
from pathlib import Path
from typing import Annotated

import lightgbm as lgb
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, model_validator

from kal_kitna.newsvendor import critical_ratio
from kal_kitna.train import feature_columns

SERVING = Path(os.environ.get("KAL_KITNA_BUNDLE", "models/serving"))
STATIC = Path(__file__).parent / "static"
LAB_REPORT = Path(os.environ.get("KAL_KITNA_LAB", "models/lab.json"))
PHONE_HINTS = ("Mobi", "Android", "iPhone", "iPad")
# Pages always revalidate, so a browser never keeps showing an old version after an update.
NO_CACHE = {"Cache-Control": "no-cache"}


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


def is_phone(user_agent: str) -> bool:
    return any(hint in user_agent for hint in PHONE_HINTS)


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


class SeriesPoint(BaseModel):
    date: Date
    forecast: float
    recommended_order: float
    actual: float | None


def create_app(
    artifacts: Artifacts | None = None, lab_report: Path | None = None
) -> FastAPI:
    art = artifacts or load_artifacts()
    lab_file = lab_report or LAB_REPORT
    feats = art.features
    families = feats["family"].astype(str)
    stores = feats["store_nbr"].astype(int)
    # (store, family, date) -> row position, built once so every lookup is instant
    index = {
        (int(s), f, d.date()): i
        for i, (s, f, d) in enumerate(zip(stores, families, feats["date"]))
    }

    app = FastAPI(
        title="Kal Kitna",
        description="How much perishable stock to order tomorrow.",
        version="1.3.0",
    )
    app.mount("/static", StaticFiles(directory=STATIC), name="static")

    def default_costs(family: str) -> tuple[float, float, float]:
        costs = art.policy["costs"]
        if (
            family not in costs["families"]
            or family not in art.policy["error_quantiles"]
        ):
            raise HTTPException(status_code=404, detail=f"Unknown family: {family}")
        c = costs["families"][family]
        return c["cost"], c["price"], costs["goodwill_pct"]

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
    def door():
        """Front door: choose the Lab (real-data results) or the Kirana App."""
        return FileResponse(STATIC / "index.html", headers=NO_CACHE)

    def layout(
        request: Request, view: str | None, phone_file: str, laptop_file: str
    ) -> FileResponse:
        """Phone layout for phones, laptop layout otherwise; ?view= overrides."""
        phone = view == "mobile" or (
            view != "desktop" and is_phone(request.headers.get("user-agent", ""))
        )
        return FileResponse(
            STATIC / (phone_file if phone else laptop_file), headers=NO_CACHE
        )

    @app.get("/lab", include_in_schema=False)
    def lab(request: Request, view: str | None = None):
        """The Lab: how the model was built and tested on the real Kaggle data."""
        return layout(request, view, "lab-mobile.html", "lab-desktop.html")

    @app.get("/lab/data")
    def lab_data():
        """Aggregated test-window results for the Lab dashboards (no data rows)."""
        if not lab_file.exists():
            raise HTTPException(
                status_code=404,
                detail="Lab report not generated yet. Run `uv run dvc repro`.",
            )
        return JSONResponse(json.loads(lab_file.read_text()))

    @app.get("/app", include_in_schema=False)
    def ui(request: Request, view: str | None = None):
        """The Kirana App: phone app or laptop dashboard."""
        return layout(request, view, "mobile.html", "desktop.html")

    @app.get("/health")
    def health():
        return {"status": "ok", "model_trees": art.model_trees}

    @app.get("/options")
    def options():
        return {
            "stores": sorted(int(s) for s in stores.unique()),
            "families": sorted(families.unique().tolist()),
            "first_date": str(feats["date"].min().date()),
            "last_date": str(feats["date"].max().date()),
            "costs": art.policy["costs"]["families"],
            "goodwill_pct": art.policy["costs"]["goodwill_pct"],
            "demo": art.policy.get("demo", False),
        }

    @app.get("/forecast", response_model=Recommendation)
    def forecast(store_nbr: Annotated[int, Query(gt=0)], family: str, date: Date):
        cost, price, goodwill = default_costs(family)
        return recommend(store_nbr, family, date, cost, price, goodwill)

    @app.post("/order", response_model=Recommendation)
    def order(req: OrderRequest):
        return recommend(
            req.store_nbr, req.family, req.date, req.cost, req.price, req.goodwill_pct
        )

    @app.get("/series", response_model=list[SeriesPoint])
    def series(store_nbr: Annotated[int, Query(gt=0)], family: str):
        """Every served day for one store and product, for charts."""
        cost, price, goodwill = default_costs(family)
        rows = feats[(stores == store_nbr) & (families == family)].sort_values("date")
        if rows.empty:
            raise HTTPException(
                status_code=404, detail=f"No data for store {store_nbr}, {family}"
            )
        preds = np.clip(art.predict(rows), 0, None)
        mult = multiplier_for(art.policy, family, critical_ratio(cost, price, goodwill))
        return [
            SeriesPoint(
                date=d.date(),
                forecast=round(float(p), 1),
                recommended_order=round(float(p) * mult, 1),
                actual=None if pd.isna(a) else round(float(a), 1),
            )
            for d, p, a in zip(rows["date"], preds, rows["sales"])
        ]

    return app
