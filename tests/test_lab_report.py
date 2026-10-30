import pandas as pd
import pytest

from kal_kitna.lab_report import build_report, error_shares


def _test_frame():
    dates = pd.to_datetime(["2017-08-01", "2017-08-02"])
    rows = []
    for store in (1, 2):
        for fam in ("DAIRY", "EGGS"):
            for d in dates:
                rows.append(
                    {
                        "date": d,
                        "store_nbr": store,
                        "family": fam,
                        "sales": 10.0,
                        "forecast": 9.0,
                        "last_week": 13.0,
                        "four_week": 15.0,
                    }
                )
    return pd.DataFrame(rows)


def test_error_shares_add_up_to_one():
    e = error_shares(_test_frame())
    assert sum(e["shares"]["model"]) == pytest.approx(1.0)
    assert e["shares"]["model"][2] == pytest.approx(
        1.0
    )  # every row is 10% off -> "10–20%" band


def test_report_has_only_aggregates():
    r = build_report(_test_frame(), {"model": {"seed": 42}})
    assert r["window"]["rows"] == 8
    assert r["overall"]["model"]["wape"] == pytest.approx(0.1)
    assert r["overall"]["last_week"]["wape"] == pytest.approx(0.3)
    assert {s["store"] for s in r["by_store"]} == {1, 2}
    assert (
        len(r["daily"]) == 2 and r["daily"][0]["actual"] == 40
    )  # 2 stores x 2 products x 10
    assert set(r["by_family"]) == {"DAIRY", "EGGS"}
