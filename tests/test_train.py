import pandas as pd

from kal_kitna.train import feature_columns


def test_features_never_include_the_answer_or_the_date():
    df = pd.DataFrame(columns=["date", "sales", "lag_1", "family"])
    assert feature_columns(df) == ["lag_1", "family"]