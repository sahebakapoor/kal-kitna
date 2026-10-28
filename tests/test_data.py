import pandas as pd

from kal_kitna.data import PERISHABLE_FAMILIES, make_perishables, validate


def _fake_inputs():
    dates = pd.to_datetime(["2017-01-01", "2017-01-02"])
    families = PERISHABLE_FAMILIES + ["AUTOMOTIVE"]  # one non-perishable to filter out
    rows = [
        {"date": d, "store_nbr": 1, "family": f, "sales": 5.0, "onpromotion": 0}
        for d in dates
        for f in families
    ]
    stores = pd.DataFrame(
        {"store_nbr": [1], "city": ["Quito"], "state": ["Pichincha"], "type": ["D"], "cluster": [13]}
    )
    return pd.DataFrame(rows), stores


def test_keeps_only_perishables():
    df = make_perishables(*_fake_inputs())
    assert set(df["family"]) == set(PERISHABLE_FAMILIES)


def test_clean_data_passes_validation():
    df = make_perishables(*_fake_inputs())
    assert validate(df) == []


def test_validation_catches_negative_sales():
    df = make_perishables(*_fake_inputs())
    df.loc[0, "sales"] = -1
    assert "negative sales" in validate(df)


def test_validation_catches_duplicates():
    df = make_perishables(*_fake_inputs())
    df = pd.concat([df, df.head(1)])
    assert "duplicate rows" in validate(df)