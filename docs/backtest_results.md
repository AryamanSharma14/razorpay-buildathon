# Backtest Results

## Methodology
- Dataset: held-out 20% test split (2,000 rows), fixed `random_state=42`
- Ground truth: same probability function used to generate training labels — this is a
  **circular validation**. It proves the scheduler finds the optimum the data encodes;
  it is not evidence about real merchants.
- Search horizon: 1–240h (widened from 48h — see Known defects in CLAUDE.md)
- Control policy: fixed 24h retry, what most merchants run
- **Synthetic data. Every number below is labelled synthetic and must stay that way.**

## Results
| Policy | Recoveries | Rate |
|---|---|---|
| Fixed 24h retry (control) | 910 / 2000 | 45.5% |
| **ML-timed (ours)** | **1221 / 2000** | **61.1%** |
| **Lift over control** | | **+15.6 pts** |

Average delay to chosen retry window: 20.4h

## Honest Framing
These rates come from synthetic probability functions, not real merchant data.
The lift figure is the meaningful one: it shows the scheduler beats a fixed-delay
policy on the same generated distribution. Absolute rates are an artifact of the
generator's coefficients and should not be quoted as a revenue promise.
Published real-world bands for comparison: retries-only ~30%, single-merchant smart
retry ~53%, best-in-class 65–85%.