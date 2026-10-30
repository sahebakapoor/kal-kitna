"""Build a licence-safe demo bundle: the real model on simulated stores and days.

The competition rules forbid sharing the dataset, so the public app never serves
real rows. Daily sales here are simulated, then turned into features by the same
build_features code the model was trained with. The real serving bundle is read
only for category labels and the ordering policy; none of its rows are copied.
"""

import json
import shutil
from pathlib import Path

import numpy as np
import pandas as pd

from kal_kitna.data import load_params
from kal_kitna.features import build_features

SERVING = Path("models/serving")
DEMO = Path("models/demo")
END = pd.Timestamp("2017-08-15")
HISTORY_DAYS = 120  # simulated history, so 28-day averages are fully warmed up
SERVE_DAYS = 28
N_STORES = 6
SEED = 7

# Illustrative daily volumes for an average demo store. Invented, not taken from the data.
BASE = {
    "BREAD/BAKERY": 120,
    "DAIRY": 250,
    "DELI": 60,
    "EGGS": 80,
    "MEATS": 90,
    "POULTRY": 110,
    "PRODUCE": 400,
    "SEAFOOD": 8,
}
WEEKDAY = [0.90, 0.85, 0.90, 0.95, 1.05, 1.20, 1.15]  # Monday ... Sunday
CATEGORICAL = ["store_nbr", "family", "city", "type"]


def labels(real: pd.DataFrame, col: str) -> list:
    """Distinct values of a column, whether or not it is stored as a category."""
    return list(real[col].astype("category").cat.categories)


def match_dtypes(feats: pd.DataFrame, real: pd.DataFrame) -> pd.DataFrame:
    """Give each column exactly the type the model saw at training time."""
    for col in CATEGORICAL:
        if isinstance(real[col].dtype, pd.CategoricalDtype):
            feats[col] = pd.Categorical(feats[col], categories=real[col].cat.categories)
        else:
            feats[col] = feats[col].astype(real[col].dtype)
    return feats


def demo_stores(real: pd.DataFrame) -> pd.DataFrame:
    """Demo stores built from valid labels, with made-up pairings."""
    stores = labels(real, "store_nbr")[:N_STORES]
    cities = labels(real, "city")
    types = labels(real, "type")
    return pd.DataFrame(
        {
            "store_nbr": stores,
            "city": [cities[i % len(cities)] for i in range(N_STORES)],
            "type": [types[i % len(types)] for i in range(N_STORES)],
            "cluster": list(range(1, N_STORES + 1)),
        }
    )


def simulate_sales(stores: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    """Daily sales with a weekly rhythm, payday bumps, promotions and noise."""
    dates = pd.date_range(end=END, periods=HISTORY_DAYS, freq="D")
    weekday = np.array([WEEKDAY[d.dayofweek] for d in dates])
    payday = np.where((dates.day == 15) | dates.is_month_end, 1.08, 1.0)
    frames = []
    for store in stores.itertuples(index=False):
        scale = rng.uniform(0.5, 1.6)
        for family, base in BASE.items():
            promo = rng.binomial(1, 0.1, len(dates)) * rng.integers(1, 6, len(dates))
            noise = rng.lognormal(0.0, 0.15, len(dates))
            sales = np.round(
                base * scale * weekday * payday * (1 + 0.03 * promo) * noise, 1
            )
            frames.append(
                pd.DataFrame(
                    {
                        "date": dates,
                        "store_nbr": store.store_nbr,
                        "family": family,
                        "sales": sales,
                        "onpromotion": promo,
                        "city": store.city,
                        "type": store.type,
                        "cluster": store.cluster,
                    }
                )
            )
    return pd.concat(frames, ignore_index=True)


def main() -> None:
    params = load_params()["features"]
    real = pd.read_parquet(SERVING / "features.parquet")  # labels and column order only

    sales = simulate_sales(demo_stores(real), np.random.default_rng(SEED))
    no_holidays = pd.DataFrame(
        {
            "date": pd.to_datetime([]),
            "type": pd.Series([], dtype=str),
            "locale": pd.Series([], dtype=str),
            "transferred": pd.Series([], dtype=bool),
        }
    )
    feats = build_features(sales, no_holidays, params["lags"], params["windows"])
    feats = match_dtypes(feats, real)
    feats = feats[real.columns]  # same column order the model was trained on

    first_day = END - pd.Timedelta(days=SERVE_DAYS - 1)
    serve = feats[feats["date"] >= first_day].reset_index(drop=True)

    if DEMO.exists():
        shutil.rmtree(DEMO)
    DEMO.mkdir(parents=True)
    shutil.copy(SERVING / "model.txt", DEMO / "model.txt")
    serve.to_parquet(DEMO / "features.parquet", index=False)
    policy = json.loads((SERVING / "policy.json").read_text())
    policy["demo"] = True
    (DEMO / "policy.json").write_text(json.dumps(policy, indent=2))

    print(
        f"Demo bundle: {len(serve):,} simulated rows, {N_STORES} stores, "
        f"{serve['date'].min().date()} to {serve['date'].max().date()} -> {DEMO}"
    )


if __name__ == "__main__":
    main()
