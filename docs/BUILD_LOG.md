# Build log

| Phase | What | Status | Notes |
|---|---|---|---|
| 0 | Setup + story spine | done | uv, ruff, pytest, product one-pager |

| 1 | Real grocery data | done | 8 perishable families, 727,488 rows, validated, 4 tests passing |

| 2 | DVC + reproducible pipeline | done | raw data versioned, local remote, params.yaml, 2-stage pipeline, 6 tests |

| 3 | First model | in progress | best baseline WAPE 0.129 → LightGBM 0.0827 (−35.9%), bias +0.7%, 1977/2000 trees |

| fuggy-farl | lag 28 at learning rate 0.05 | 0.0823 | 2691 |

- Interaction: with lag 28, lr 0.1 beat lr 0.05 (0.0817 vs 0.0823), the opposite of what happened without it.
- Decision: lunar-ossa (lr 0.1, lags 1/7/14/28). Lowest valid WAPE and ~30% fewer trees than the first model.
- Caveat: gaps between experiments are small and from one 4-week window; the robust result is the 37% gain over baseline.

| 3 | Baseline + LightGBM + MLflow | done | test WAPE 0.134 -> 0.089 (-33.5%), bias +0.9%; 5 experiments, lag 28 + lr 0.1 won; 16 tests |

### Sensitivity to goodwill (share of price lost per missed sale)
| goodwill | Kal Kitna profit vs naive | waste cut | fill rate |
|---|---|---|---|
| 0.0 | | | |
| 0.2 (default) | | | |
| 0.5 | | | |
Conclusion: ...

| 4 | Decision layer (newsvendor) | done | per-family multipliers calibrated on valid; test: waste cut ___%, profit +Rs ___/store; goodwill sensitivity 0-0.5; 27 tests |

| 5 | FastAPI + tests | done | 4 endpoints + docs redirect, serving bundle, 38 tests, p95 ___ ms |