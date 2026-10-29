import pytest

from kal_kitna.newsvendor import critical_ratio


def test_paneer_example_without_goodwill():
    # lose 20 by running out, 70 by wasting: 20 / 90
    assert critical_ratio(cost=70, price=90) == pytest.approx(20 / 90)


def test_goodwill_raises_the_ratio():
    assert critical_ratio(70, 90, goodwill_pct=0.2) > critical_ratio(70, 90)


def test_equal_costs_give_half():
    # margin 50 equals cost 50 -> order the median
    assert critical_ratio(cost=50, price=100) == pytest.approx(0.5)


def test_rejects_selling_at_a_loss():
    with pytest.raises(ValueError):
        critical_ratio(cost=100, price=90)