"""The newsvendor rule: how much to order when leftovers spoil."""


def critical_ratio(cost: float, price: float, goodwill_pct: float = 0.0) -> float:
    """Share of the demand distribution an order should cover.

    Underage (running out) costs the lost margin plus goodwill.
    Overage (leftovers) costs the full purchase price, because perishables spoil.
    """
    if not 0 < cost < price:
        raise ValueError("Need 0 < cost < price for a sensible order")
    underage = (price - cost) + goodwill_pct * price
    overage = cost
    return underage / (underage + overage)
