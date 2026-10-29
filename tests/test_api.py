import pandas as pd
import pytest
from fastapi.testclient import TestClient

from kal_kitna.api import Artifacts, create_app

LEVELS = [round(q / 100, 2) for q in range(1, 100)]


def _artifacts():
    features = pd.DataFrame(
        {
            "date": pd.to_datetime(["2017-08-01", "2017-08-01"]),
            "store_nbr": pd.Categorical([1, 1]),
            "family": pd.Categorical(["DAIRY", "EGGS"]),
            "sales": [12.0, None],
            "lag_1": [10.0, 4.0],
        }
    )
    spread = [0.5 + q for q in LEVELS]  # multiplier = 0.5 + critical ratio
    policy = {
        "quantile_levels": LEVELS,
        "error_quantiles": {"DAIRY": spread, "EGGS": spread},
        "costs": {
            "goodwill_pct": 0.0,
            "families": {"DAIRY": {"cost": 50, "price": 100}, "EGGS": {"cost": 6, "price": 7}},
        },
        "model_trees": 7,
    }
    return Artifacts(
        features=features,
        policy=policy,
        predict=lambda df: df["lag_1"].to_numpy(),  # fake model: forecast = lag_1
        model_trees=7,
    )


@pytest.fixture
def client():
    return TestClient(create_app(_artifacts()))


def test_root_redirects_to_docs(client):
    r = client.get("/", follow_redirects=False)
    assert r.status_code in (302, 307)
    assert r.headers["location"] == "/docs"


def test_health(client):
    assert client.get("/health").json() == {"status": "ok", "model_trees": 7}


def test_options(client):
    body = client.get("/options").json()
    assert body["stores"] == [1]
    assert body["families"] == ["DAIRY", "EGGS"]
    assert body["first_date"] == body["last_date"] == "2017-08-01"


def test_forecast_at_ratio_half_orders_the_forecast(client):
    # cost 50, price 100, no goodwill -> ratio 0.5 -> multiplier 1.0
    body = client.get("/forecast?store_nbr=1&family=DAIRY&date=2017-08-01").json()
    assert body["forecast"] == 10.0
    assert body["critical_ratio"] == 0.5
    assert body["recommended_order"] == 10.0
    assert body["actual"] == 12.0


def test_unknown_actual_is_null(client):
    body = client.get("/forecast?store_nbr=1&family=EGGS&date=2017-08-01").json()
    assert body["actual"] is None


def test_owner_goodwill_raises_the_order(client):
    payload = {
        "store_nbr": 1,
        "family": "DAIRY",
        "date": "2017-08-01",
        "cost": 50,
        "price": 100,
        "goodwill_pct": 0.5,
    }
    body = client.post("/order", json=payload).json()
    assert body["recommended_order"] > body["forecast"]


def test_cost_above_price_is_rejected(client):
    payload = {"store_nbr": 1, "family": "DAIRY", "date": "2017-08-01", "cost": 90, "price": 60}
    assert client.post("/order", json=payload).status_code == 422


def test_unknown_store_is_404(client):
    assert client.get("/forecast?store_nbr=999&family=DAIRY&date=2017-08-01").status_code == 404


def test_unknown_family_is_404(client):
    assert client.get("/forecast?store_nbr=1&family=COFFEE&date=2017-08-01").status_code == 404