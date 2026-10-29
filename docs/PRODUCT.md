# Kal Kitna: Product One-Pager

*"Kal kitna?" means "how much tomorrow?"*

## Problem
Every evening, small grocery stores guess how much perishable stock to
order for tomorrow. Guess high and paneer, milk, and bread go in the
bin. Guess low and customers walk to the next shop. The guess is
usually gut feel plus "same as last week."

## User
The owner or ops person at a small store (or a chain of them) who
places tomorrow's order for perishables.

## What it does
Forecasts tomorrow's demand per product, then recommends how much to
order based on what waste costs versus what a missed sale costs. It
shows the decision on a phone-friendly bar: run out, sweet spot,
or waste.

## Why I care
[YOUR LINE. One honest sentence.]

## How success is measured
- Forecast beats the naive "same day last week" baseline on held-out
  weeks (WAPE)
- Recommended orders cut simulated waste in rupees versus the naive
  order, without blowing up stockouts
- API p95 latency under 200 ms
- Drift monitoring flags festival and holiday periods before
  forecast error spikes go unnoticed

## Assumptions
Training data is real grocery sales from Ecuador (Corporación
Favorita, via Kaggle). Cost and price per item are assumptions the
user can change. Festivals break forecasts everywhere; the method
transfers, the exact numbers don't.

## Non-goals (v1)
No live store integration, no automatic ordering, no multi-day
ordering for items with longer shelf life.

API latency (/forecast, in-process, 300 random requests, my laptop): p50 ___ ms, p95 ___ ms. Target p95 < 200 ms: met / not met.

| API p95 latency < 200 ms | p95 ___ ms (in-process, 300 requests) | ___ |