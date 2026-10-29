import pandas as pd
import pytest

from kal_kitna.evaluation import bias, time_split, wape


def test_wape_is_zero_for_a_perfect_forecast():
    assert wape([10, 20], [10, 20]) == 0


def test_wape_by_hand():
    # off by 2 and 2, total sales 20 -> 4 / 20
    assert wape([10, 10], [12, 8]) == pytest.approx(0.2)


def test_wape_refuses_zero_total():
    with pytest.raises(ValueError):
        wape([0, 0], [1, 1])


def test_bias_is_positive_when_over_forecasting():
    assert bias([10, 10], [12, 12]) == pytest.approx(0.2)


def test_time_split_has_no_overlap_and_loses_nothing():
    df = pd.DataFrame({"date": pd.date_range("2017-06-01", "2017-08-15", freq="D")})
    train, valid, test = time_split(df, "2017-06-21", "2017-07-19")
    assert len(train) + len(valid) + len(test) == len(df)
    assert train["date"].max() < valid["date"].min()
    assert valid["date"].max() < test["date"].min()