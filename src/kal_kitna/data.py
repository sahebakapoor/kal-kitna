"""Load raw Favorita sales and build a clean perishables dataset."""

from pathlib import Path

import pandas as pd
import yaml

RAW = Path("data/raw")
PROCESSED = Path("data/processed")
PARAMS = Path("params.yaml")


def load_params(path: Path = PARAMS) -> dict:
    """Read experiment settings from params.yaml."""
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_raw(raw_dir: Path = RAW) -> dict[str, pd.DataFrame]:
    """Read the raw CSVs we need."""
    return {
        "train": pd.read_csv(raw_dir / "train.csv", parse_dates=["date"]),
        "stores": pd.read_csv(raw_dir / "stores.csv"),
        "holidays": pd.read_csv(raw_dir / "holidays_events.csv", parse_dates=["date"]),
    }


def make_perishables(
    train: pd.DataFrame, stores: pd.DataFrame, families: list[str]
) -> pd.DataFrame:
    """Keep the given families and attach store details."""
    df = train[train["family"].isin(families)].copy()
    df = df.merge(
        stores[["store_nbr", "city", "type", "cluster"]], on="store_nbr", how="left"
    )
    df = df.sort_values(["store_nbr", "family", "date"]).reset_index(drop=True)
    return df[
        [
            "date",
            "store_nbr",
            "family",
            "sales",
            "onpromotion",
            "city",
            "type",
            "cluster",
        ]
    ]


def validate(df: pd.DataFrame, families: list[str]) -> list[str]:
    """Return a list of problems. An empty list means the data is clean."""
    problems = []
    if df.empty:
        problems.append("no rows")
        return problems
    if (df["sales"] < 0).any():
        problems.append("negative sales")
    if df.duplicated(["date", "store_nbr", "family"]).any():
        problems.append("duplicate rows")
    if df[["date", "store_nbr", "family", "sales"]].isna().any().any():
        problems.append("nulls in key columns")
    missing = set(families) - set(df["family"].unique())
    if missing:
        problems.append(f"missing families: {sorted(missing)}")
    return problems


def main() -> None:
    families = load_params()["data"]["families"]
    raw = load_raw()
    df = make_perishables(raw["train"], raw["stores"], families)
    problems = validate(df, families)
    if problems:
        raise ValueError(f"Data validation failed: {problems}")
    PROCESSED.mkdir(parents=True, exist_ok=True)
    df.to_parquet(PROCESSED / "perishables.parquet", index=False)
    raw["holidays"].to_parquet(PROCESSED / "holidays.parquet", index=False)
    print(f"Saved {len(df):,} rows to {PROCESSED / 'perishables.parquet'}")


if __name__ == "__main__":
    main()
