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