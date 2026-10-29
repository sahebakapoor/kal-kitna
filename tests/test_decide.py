import pandas as pd
import pytest

from kal_kitna.decide import family_ratios, fit_multipliers, policy_orders, simulate

COSTS = {"goodwill_pct": 0.2, "families": {"DAIRY": {"cost": 70, "price": 90}}}


# ---------- calibration: how much to scale the forecast ----------


def _calib():
    # forecast is always 10; actual sales give ratios 0.8, 0.9, 1.0, 1.1, 1.2
    return pd.DataFrame(
        {
            "family": ["DAIRY"] * 6,
            "forecast": [10, 10, 10, 10, 10, 0.5],  # last row is too small to use
            "sales": [8, 9, 10, 11, 12, 40],
        }
    )


def test_multiplier_at_the_median_is_one():
    assert fit_multipliers(_calib(), {"DAIRY": 0.5})["DAIRY"] == pytest.approx(1.0)


def test_low_ratio_orders_below_forecast():
    assert fit_multipliers(_calib(), {"DAIRY": 0.25})["DAIRY"] == pytest.approx(0.9)


def test_tiny_forecasts_are_ignored():
    # the 40 / 0.5 = 80x row would blow up the top quantile if it were used
    assert fit_multipliers(_calib(), {"DAIRY": 1.0})["DAIRY"] == pytest.approx(1.2)


def test_family_ratios_reads_costs():
    costs = {"goodwill_pct": 0.0, "families": {"DAIRY": {"cost": 70, "price": 90}}}
    assert family_ratios(costs)["DAIRY"] == pytest.approx(20 / 90)


# ---------- policies: three ways to decide tomorrow's order ----------


def test_policies_use_the_right_inputs():
    df = pd.DataFrame(
        {
            "family": pd.Categorical(["DAIRY", "EGGS"]),
            "forecast": [10.0, 20.0],
            "lag_7": [8.0, None],  # EGGS has no last-week value
            "mean_28": [9.0, 15.0],
        }
    )
    orders = policy_orders(df, {"DAIRY": 0.9, "EGGS": 0.5})
    assert orders["kal_kitna"].tolist() == [9.0, 10.0]  # forecast x family multiplier
    assert orders["naive_last_week"].tolist() == [8.0, 15.0]  # falls back to the 28-day mean
    assert orders["forecast_only"].tolist() == [10.0, 20.0]


# ---------- simulation: what the orders cost in rupees ----------


def _one_day(actual):
    return pd.DataFrame({"family": ["DAIRY"], "sales": [actual]})


def test_over_ordering_costs_waste_only():
    r = simulate(_one_day(10), pd.Series([12.0]), COSTS)
    assert r["waste_rs"] == 140  # 2 spoiled x 70
    assert r["stockout_rs"] == 0
    assert r["profit_rs"] == 60  # sold 10 x 90 - bought 12 x 70


def test_under_ordering_costs_margin_and_goodwill():
    r = simulate(_one_day(10), pd.Series([8.0]), COSTS)
    assert r["waste_rs"] == 0
    assert r["stockout_rs"] == 76  # 2 short x (20 margin + 18 goodwill)
    assert r["fill_rate"] == 0.8