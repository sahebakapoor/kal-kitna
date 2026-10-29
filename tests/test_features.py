import pandas as pd

from kal_kitna.features import (
    add_lag_features,
    build_features,
    complete_calendar,
    trim_leading_zeros,
)


def _series(sales, start="2017-01-01"):
    """One store, one family, consecutive days."""
    dates = pd.date_range(start, periods=len(sales), freq="D")
    return pd.DataFrame({"date": dates, "store_nbr": 1, "family": "DAIRY", "sales": sales})


def test_trim_drops_only_leading_zeros():
    df = trim_leading_zeros(_series([0, 0, 5, 0, 3]))
    assert df["sales"].tolist() == [5, 0, 3]


def test_lags_only_use_the_past():
    # Sales equal the day number: 1 Jan sold 1, 2 Jan sold 2, ...
    df = add_lag_features(_series(list(range(1, 21))), lags=[1, 7], windows=[7])
    row = df[df["date"] == "2017-01-10"].iloc[0]  # this day sold 10
    assert row["lag_1"] == 9  # yesterday
    assert row["lag_7"] == 3  # same weekday last week
    assert row["mean_7"] == 6  # average of days 3..9, NOT including day 10


def test_missing_day_does_not_shift_lags():
    df = _series(list(range(1, 21)))
    df = df[df["date"] != "2017-01-05"]  # pretend the shop was closed
    df = add_lag_features(complete_calendar(df), lags=[7], windows=[7])
    assert pd.isna(df.loc[df["date"] == "2017-01-12", "lag_7"].item())  # 7 days back is the closed day
    assert df.loc[df["date"] == "2017-01-13", "lag_7"].item() == 6


def test_build_features_end_to_end():
    df = _series([0, 4, 5, 6])
    df["onpromotion"] = 0
    df["city"] = "Quito"
    df["type"] = "D"
    df["cluster"] = 13
    holidays = pd.DataFrame(
        {
            "date": pd.to_datetime(["2017-01-03"]),
            "type": ["Holiday"],
            "locale": ["National"],
            "transferred": [False],
        }
    )
    out = build_features(df, holidays, lags=[1], windows=[2])
    assert len(out) == 3  # the leading zero is gone
    assert out["sales"].notna().all()  # no calendar-filler rows left
    assert out.loc[out["date"] == "2017-01-03", "is_holiday"].item() == 1
    assert out["family"].dtype == "category"