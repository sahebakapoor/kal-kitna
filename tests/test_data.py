import pandas as pd

from kal_kitna.data import load_params, make_perishables, validate

FAMILIES = ["DAIRY", "PRODUCE"]  # a small list, so tests don't depend on the config


def _fake_inputs():
    dates = pd.to_datetime(["2017-01-01", "2017-01-02"])
    families = FAMILIES + ["AUTOMOTIVE"]  # one family that should be filtered out
    rows = [
        {"date": d, "store_nbr": 1, "family": f, "sales": 5.0, "onpromotion": 0}
        for d in dates
        for f in families
    ]
    stores = pd.DataFrame(
        {"store_nbr": [1], "city": ["Quito"], "state": ["Pichincha"], "type": ["D"], "cluster": [13]}
    )
    return pd.DataFrame(rows), stores


def test_keeps_only_listed_families():
    df = make_perishables(*_fake_inputs(), FAMILIES)
    assert set(df["family"]) == set(FAMILIES)


def test_clean_data_passes_validation():
    df = make_perishables(*_fake_inputs(), FAMILIES)
    assert validate(df, FAMILIES) == []


def test_validation_catches_negative_sales():
    df = make_perishables(*_fake_inputs(), FAMILIES)
    df.loc[0, "sales"] = -1
    assert "negative sales" in validate(df, FAMILIES)


def test_validation_catches_duplicates():
    df = make_perishables(*_fake_inputs(), FAMILIES)
    df = pd.concat([df, df.head(1)])
    assert "duplicate rows" in validate(df, FAMILIES)


def test_validation_catches_missing_family():
    df = make_perishables(*_fake_inputs(), ["DAIRY"])  # PRODUCE gets dropped
    problems = validate(df, FAMILIES)
    assert any("missing families" in p for p in problems)


def test_params_file_lists_eight_families():
    params = load_params()
    assert len(params["data"]["families"]) == 8