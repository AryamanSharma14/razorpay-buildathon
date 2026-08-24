# Backtest Results

## Methodology
- Dataset: held-out 20% test split (2,000 rows), fixed `random_state=42`
- Ground truth: same probability function used to generate training labels
- This validates the orchestration mechanism, NOT a real-world revenue promise
- Plug in real merchant transaction history and retrain for production estimates

## Results
| Metric | Value |
|---|---|
| Soft-decline rows evaluated | 2000 |
| Simulated recoveries | 1345 |
| **Soft-decline recovery rate** | **67.2%** |
| Avg delay to recovery (hrs) | 28.2 |
| Hard declines retried | 0 (should be 0) |

## Honest Framing
The recovery rate above is derived from synthetic probability functions, not real merchant data.
It demonstrates that the ML scheduling logic correctly targets high-probability windows.
Actual recovery rates vary by merchant, payment method, customer segment, and retry timing.

## ⚠️ SUPERSEDED — do not cite this number (2026-08-24)

These results were produced with `predict_retry_window()` scanning **1–48h**. Published analysis of
real failed payments (see `docs/research-brief.md`) shows that for `insufficient_funds` — the most
common soft decline — only ~8% of recoveries occur same-day while **>60% occur 1–7 days later**,
and 90% of all recoveries land within 10 days.

The 48h cap therefore excludes most of the real recovery mass, and the 28.2h average delay sits
close enough to that ceiling to suggest the search was constrained by it.

**Both the search window and the training-data probability function must be corrected (widen to
1–240h) and this backtest re-run before any number here is quoted.** Expect the figure to move.
Report whichever direction it moves — the point of the fix is correctness, not a better number.

Replacement measurement is the multi-policy comparison in the win plan, which reports lift against
a `razorpay_default` control rather than an unanchored rate.