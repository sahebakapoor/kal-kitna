"""Measure /forecast latency in-process over random requests: p50 and p95 in ms."""

import json
import random
import time
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient

from kal_kitna.api import create_app, load_artifacts


def main(n: int = 300) -> None:
    art = load_artifacts()
    client = TestClient(create_app(art))
    rows = art.features[["store_nbr", "family", "date"]].astype(str).values.tolist()
    random.seed(42)
    sample = random.sample(rows, n)

    store, family, day = sample[0]  # warm-up: first prediction is always slower
    client.get(
        "/forecast", params={"store_nbr": store, "family": family, "date": day[:10]}
    )

    times = []
    for store, family, day in sample:
        start = time.perf_counter()
        r = client.get(
            "/forecast", params={"store_nbr": store, "family": family, "date": day[:10]}
        )
        times.append((time.perf_counter() - start) * 1000)
        r.raise_for_status()

    p50, p95 = np.percentile(times, [50, 95])
    result = {
        "requests": n,
        "p50_ms": round(float(p50), 1),
        "p95_ms": round(float(p95), 1),
    }
    Path("reports/latency.json").write_text(json.dumps(result, indent=2))
    print(result)


if __name__ == "__main__":
    main()
