import pandas as pd
import pytest

from kal_kitna.export import LEVELS, error_quantiles


def test_levels_cover_1_to_99_percent():
    assert LEVELS[0] == 0.01
    assert LEVELS[-1] == 0.99
    assert len(LEVELS) == 99


def test_perfect_forecasts_give_ratio_one_everywhere():
    calib = pd.DataFrame(
        {
            "family": ["DAIRY"] * 3 + ["DAIRY"],
            "forecast": [10, 20, 30, 0.2],  # last row is too small and must be ignored
            "sales": [10, 20, 30, 50],
        }
    )
    table = error_quantiles(calib)
    assert table["DAIRY"] == pytest.approx([1.0] * 99)
