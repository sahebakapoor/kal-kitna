import pandas as pd
import pytest
from fastapi.testclient import TestClient

from kal_kitna.api import Artifacts, create_app, is_phone

LEVELS = [round(q / 100, 2) for q in range(1, 100)]
IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"
LAPTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0"


def _artifacts():
    features = pd.DataFrame(
        {
            "date": pd.to_datetime(["2017-08-01", "2017-08-01", "2017-08-02"]),
            "store_nbr": pd.Categorical([1, 1, 1]),
            "family": pd.Categorical(["DAIRY", "EGGS", "DAIRY"]),
            "sales": [12.0, None, 9.0],
            "lag_1": [10.0, 4.0, 8.0],
        }
    )
    spread = [0.5 + q for q in LEVELS]  # multiplier = 0.5 + critical ratio
    policy = {
        "quantile_levels": LEVELS,
        "error_quantiles": {"DAIRY": spread, "EGGS": spread},
        "costs": {
            "goodwill_pct": 0.0,
            "families": {
                "DAIRY": {"cost": 50, "price": 100},
                "EGGS": {"cost": 6, "price": 7},
            },
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


# ---------- pages ----------


def test_front_door_offers_both_doors(client):
    r = client.get("/")
    assert r.status_code == 200
    assert 'data-page="door"' in r.text
    assert 'href="/lab"' in r.text and 'href="/app"' in r.text


def test_lab_has_phone_and_laptop_layouts(client):
    phone = client.get("/lab", headers={"user-agent": IPHONE})
    laptop = client.get("/lab", headers={"user-agent": LAPTOP})
    assert 'data-page="lab"' in phone.text and 'data-layout="mobile"' in phone.text
    assert 'data-layout="desktop"' in laptop.text


def test_lab_data_missing_is_404(tmp_path):
    client = TestClient(create_app(_artifacts(), lab_report=tmp_path / "nope.json"))
    assert client.get("/lab/data").status_code == 404


def test_lab_data_is_served(tmp_path):
    report = tmp_path / "lab.json"
    report.write_text('{"overall": {"model": {"wape": 0.09}}}')
    client = TestClient(create_app(_artifacts(), lab_report=report))
    assert client.get("/lab/data").json()["overall"]["model"]["wape"] == 0.09


def test_phone_gets_mobile_layout(client):
    r = client.get("/app", headers={"user-agent": IPHONE})
    assert r.status_code == 200
    assert 'data-layout="mobile"' in r.text


def test_laptop_gets_desktop_layout(client):
    r = client.get("/app", headers={"user-agent": LAPTOP})
    assert 'data-layout="desktop"' in r.text


def test_pages_are_never_served_stale(client):
    for path in ("/", "/app", "/lab"):
        assert client.get(path).headers["cache-control"] == "no-cache"


def test_view_parameter_overrides_device(client):
    r = client.get("/app?view=desktop", headers={"user-agent": IPHONE})
    assert 'data-layout="desktop"' in r.text


def test_shared_assets_are_served(client):
    assert client.get("/static/kk.css").status_code == 200
    assert client.get("/static/core.js").status_code == 200


def test_is_phone():
    assert is_phone(IPHONE)
    assert not is_phone(LAPTOP)


# ---------- data ----------


def test_health(client):
    assert client.get("/health").json() == {"status": "ok", "model_trees": 7}


def test_options(client):
    body = client.get("/options").json()
    assert body["stores"] == [1]
    assert body["families"] == ["DAIRY", "EGGS"]
    assert body["first_date"] == "2017-08-01"
    assert body["last_date"] == "2017-08-02"
    assert body["costs"]["DAIRY"] == {"cost": 50, "price": 100}
    assert body["demo"] is False


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
    payload = {
        "store_nbr": 1,
        "family": "DAIRY",
        "date": "2017-08-01",
        "cost": 90,
        "price": 60,
    }
    assert client.post("/order", json=payload).status_code == 422


def test_unknown_store_is_404(client):
    assert (
        client.get("/forecast?store_nbr=999&family=DAIRY&date=2017-08-01").status_code
        == 404
    )


def test_unknown_family_is_404(client):
    assert (
        client.get("/forecast?store_nbr=1&family=COFFEE&date=2017-08-01").status_code
        == 404
    )


def test_series_is_sorted_and_complete(client):
    body = client.get("/series?store_nbr=1&family=DAIRY").json()
    assert [p["date"] for p in body] == ["2017-08-01", "2017-08-02"]
    assert body[0] == {
        "date": "2017-08-01",
        "forecast": 10.0,
        "recommended_order": 10.0,
        "actual": 12.0,
    }


def test_series_unknown_store_is_404(client):
    assert client.get("/series?store_nbr=999&family=DAIRY").status_code == 404
