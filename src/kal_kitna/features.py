"""Turn clean daily sales into model-ready features, without peeking at the future."""

from pathlib import Path

import pandas as pd

from kal_kitna.data import load_params

PROCESSED = Path("data/processed")
FEATURES = Path("data/features")
KEYS = ["store_nbr", "family"]
CATEGORICAL = ["store_nbr", "family", "city", "type"]


def trim_leading_zeros(df: pd.DataFrame) -> pd.DataFrame:
    """Drop each store-family's history before its first real sale."""
    first_sale = df[df["sales"] > 0].groupby(KEYS)["date"].min().rename("first_sale")
    df = df.join(first_sale, on=KEYS)
    return df[df["date"] >= df["first_sale"]].drop(columns="first_sale")


def complete_calendar(df: pd.DataFrame) -> pd.DataFrame:
    """Add missing days (like 25 December) so shifting n rows always means n days."""
    full_index = pd.MultiIndex.from_product(
        [
            df["store_nbr"].unique(),
            df["family"].unique(),
            pd.date_range(df["date"].min(), df["date"].max(), freq="D"),
        ],
        names=["store_nbr", "family", "date"],
    )
    return df.set_index(["store_nbr", "family", "date"]).reindex(full_index).reset_index()


def add_lag_features(df: pd.DataFrame, lags: list[int], windows: list[int]) -> pd.DataFrame:
    """Past sales only. Every feature for day D uses data from before day D."""
    df = df.sort_values(KEYS + ["date"]).copy()
    sales = df.groupby(KEYS)["sales"]
    for lag in lags:
        df[f"lag_{lag}"] = sales.shift(lag)
    for window in windows:
        df[f"mean_{window}"] = sales.transform(
            lambda s, w=window: s.shift(1).rolling(w, min_periods=1).mean()
        )
    return df


def add_calendar_features(df: pd.DataFrame, holidays: pd.DataFrame) -> pd.DataFrame:
    """Things the shop owner knows about tomorrow in advance."""
    df["day_of_week"] = df["date"].dt.day_of_week
    df["day_of_month"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["is_payday"] = (df["date"].dt.day.eq(15) | df["date"].dt.is_month_end).astype(int)
    national = holidays[
        holidays["locale"].eq("National")
        & ~holidays["transferred"]
        & holidays["type"].ne("Work Day")
    ]
    df["is_holiday"] = df["date"].isin(national["date"]).astype(int)
    df["is_pre_christmas"] = (
        df["date"].dt.month.eq(12) & df["date"].dt.day.between(15, 24)
    ).astype(int)
    df["is_quake_period"] = df["date"].between("2016-04-16", "2016-05-15").astype(int)
    return df


def build_features(
    df: pd.DataFrame, holidays: pd.DataFrame, lags: list[int], windows: list[int]
) -> pd.DataFrame:
    df = trim_leading_zeros(df)
    df = complete_calendar(df)
    df = add_lag_features(df, lags, windows)
    df = add_calendar_features(df, holidays)
    df = df[df["sales"].notna()].copy()  # drop the calendar-filler days again
    for col in CATEGORICAL:
        df[col] = df[col].astype("category")
    return df.reset_index(drop=True)


def main() -> None:
    params = load_params()["features"]
    df = pd.read_parquet(PROCESSED / "perishables.parquet")
    holidays = pd.read_parquet(PROCESSED / "holidays.parquet")
    feats = build_features(df, holidays, params["lags"], params["windows"])
    FEATURES.mkdir(parents=True, exist_ok=True)
    feats.to_parquet(FEATURES / "features.parquet", index=False)
    removed = len(df) - len(feats)
    print(f"Saved {len(feats):,} rows and {feats.shape[1]} columns")
    print(f"Removed {removed:,} fake-zero rows ({removed / len(df):.1%} of the data)")


if __name__ == "__main__":
    main()