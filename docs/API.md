# Kal Kitna API contract

Run locally from the project root:

    uv run dvc repro
    uv run uvicorn kal_kitna.api:create_app --factory --reload

Then open http://127.0.0.1:8000 (redirects to the interactive docs).

Run in Docker (needs models/serving on disk: `uv run dvc repro`):

    docker build -t kal-kitna:dev .
    docker run -d --name kal-kitna -p 8000:8000 kal-kitna:dev

Then open http://127.0.0.1:8000. Stop with `docker rm -f kal-kitna`.

All responses are JSON. Dates are YYYY-MM-DD. Quantities are units (or kg for weight-sold families).

## GET /health
Response: {"status": "ok", "model_trees": 1397}

## GET /options
Response: {"stores": [1, 2, ...], "families": ["BREAD/BAKERY", ...], "first_date": "2017-07-19", "last_date": "2017-08-15"}

## GET /forecast?store_nbr=1&family=DAIRY&date=2017-08-01
Response:
{
  "store_nbr": 1, "family": "DAIRY", "date": "2017-08-01",
  "forecast": 182.4,
  "critical_ratio": 0.306,
  "recommended_order": 165.0,
  "actual": 170.0
}
"actual" is included because the demo serves held-out weeks where the real answer is known. It is null when unknown.

## POST /order
Body: {"store_nbr": 1, "family": "DAIRY", "date": "2017-08-01", "cost": 50, "price": 60, "goodwill_pct": 0.2}
Response: same shape as /forecast, using the owner's prices.

## Errors
- 404 if the store, family, or date is not in the served data.
- 422 if inputs are invalid (for example cost >= price, or a malformed date). FastAPI explains which field.