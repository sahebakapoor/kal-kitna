import pandas as pd
import pytest

from kal_kitna.decide import family_ratios, fit_multipliers


def _calib():
    # forecast is always 10; actual sales give ratios 0.8, 0.9, 1.0, 1.1, 1.2
    return pd.DataFrame(
        {
            "family": ["DAIRY"] * 5 + ["DAIRY"],
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