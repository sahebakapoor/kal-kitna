"""Scoring and splitting shared by every model, so they're judged identically."""

import numpy as np
import pandas as pd


def wape(actual, predicted) -> float:
    """Total absolute error divided by total actual sales. Lower is better."""
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    total = actual.sum()
    if total == 0:
        raise ValueError("WAPE is undefined when total actual sales are zero")
    return float(np.abs(actual - predicted).sum() / total)


def bias(actual, predicted) -> float:
    """Overall lean of the forecast. Positive means over-forecasting (waste risk)."""
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    return float((predicted - actual).sum() / actual.sum())


def time_split(df: pd.DataFrame, valid_start: str, test_start: str):
    """Train on the past, validate on the middle, test on the most recent weeks."""
    train = df[df["date"] < valid_start]
    valid = df[(df["date"] >= valid_start) & (df["date"] < test_start)]
    test = df[df["date"] >= test_start]
    return train, valid, test