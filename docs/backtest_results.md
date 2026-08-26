# Multi-Policy Backtest Results

## Methodology
- Held-out 20% test split (2000 rows), fixed `random_state=42`
- **Circular validation** — ground truth = same generator as training. Proves
  scheduler finds the optimum the data encodes; not evidence about real merchants.
- Search horizon: 1–240h
- Baseline: `razorpay_default` (3 fixed-slot reminders, not decline-aware)
- Network fines: estimated INR per attempt over Visa 20/30d or MC 10/24h cap
  (declared assumptions: Visa ₹8/violation, MC ₹20/violation)

## Results
| Policy | Rate | Recovered | Attempts | Fines (INR) | Lift vs baseline |
|---|---|---|---|---|---|
| no_retry | 0.0% | 0/2000 | 0 | ₹0.0 | -88.7 pts |
| razorpay_default | 88.7% | 1774/2000 | 3353 | ₹0.0 | +0.0 pts |
| naive_24h | 58.5% | 1169/2000 | 2000 | ₹0.0 | -30.2 pts |
| ours_ml_payday | 66.0% | 1320/2000 | 2000 | ₹0.0 | -22.7 pts |
| retry_all_aggressive | 100.0% | 2000/2000 | 4366 | ₹300.0 | +11.3 pts |

## Honest Framing
Absolute rates are artifacts of the generator's coefficients.
Lift over razorpay_default is the load-bearing number.
Real-world bands (not ours): aggregate ML 22–40%, best-in-class 45–60%.
These rates must always be cited as synthetic alongside the control.