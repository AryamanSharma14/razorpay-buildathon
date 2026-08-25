"""
Backtest the ML retry predictor on held-out test data.
Methodology: uses the SAME probability function from generate_training_data.py as ground truth.
This validates the orchestration mechanism, not a real-world recovery rate.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
import pandas as pd
from sklearn.model_selection import train_test_split
import joblib

import numpy as np
from datetime import datetime, timedelta

from scripts.generate_training_data import success_prob

MAX_HORIZON_HOURS = 240
NAIVE_DELAY_HOURS = 24

random.seed(42)


def run(output_md=True):
    df = pd.read_csv("data/training.csv")
    _, df_test = train_test_split(df, test_size=0.2, random_state=42)

    bundle = joblib.load("models/retry_model.pkl")
    clf = bundle["model"]

    def enc(key, v, fallback):
        e = bundle[key]
        try:
            return e.transform([str(v)])[0]
        except Exception:
            return e.transform([fallback])[0]

    now = datetime.utcnow()
    hours = np.arange(1, MAX_HORIZON_HOURS + 1)
    futures = [now + timedelta(hours=int(h)) for h in hours]

    ours_hits, naive_hits = 0, 0
    ours_delays = []

    for _, row in df_test.iterrows():
        reason, method = row["error_reason"], row["method"]
        intl, amt = int(row["international"]), int(row["amount_bucket"])
        network, ctype, issuer = row["card_network"], row["card_type"], row["card_issuer"]

        base = [enc("method_enc", method, "card"), intl,
                enc("reason_enc", reason, "payment_failed"), amt,
                enc("card_network_enc", network, "none"),
                enc("card_type_enc", ctype, "none"),
                enc("card_issuer_enc", issuer, "none")]

        X = np.array([[f.hour, f.weekday(), int(h)] + base for h, f in zip(hours, futures)])
        best_h = int(hours[int(clf.predict_proba(X)[:, 1].argmax())])

        for delay, is_ours in ((best_h, True), (NAIVE_DELAY_HOURS, False)):
            t = now + timedelta(hours=delay)
            p = success_prob(t.hour, t.weekday(), method, bool(intl), reason, amt,
                             delay, network, ctype, issuer)
            if random.random() < p:
                if is_ours:
                    ours_hits += 1
                    ours_delays.append(delay)
                else:
                    naive_hits += 1

    n = len(df_test)
    ours_rate = ours_hits / n * 100
    naive_rate = naive_hits / n * 100
    avg_delay = sum(ours_delays) / len(ours_delays) if ours_delays else 0

    lines = [
        "# Backtest Results",
        "",
        "## Methodology",
        "- Dataset: held-out 20% test split (2,000 rows), fixed `random_state=42`",
        "- Ground truth: same probability function used to generate training labels — this is a",
        "  **circular validation**. It proves the scheduler finds the optimum the data encodes;",
        "  it is not evidence about real merchants.",
        f"- Search horizon: 1–{MAX_HORIZON_HOURS}h (widened from 48h — see Known defects in CLAUDE.md)",
        f"- Control policy: fixed {NAIVE_DELAY_HOURS}h retry, what most merchants run",
        "- **Synthetic data. Every number below is labelled synthetic and must stay that way.**",
        "",
        "## Results",
        "| Policy | Recoveries | Rate |",
        "|---|---|---|",
        f"| Fixed {NAIVE_DELAY_HOURS}h retry (control) | {naive_hits} / {n} | {naive_rate:.1f}% |",
        f"| **ML-timed (ours)** | **{ours_hits} / {n}** | **{ours_rate:.1f}%** |",
        f"| **Lift over control** | | **{ours_rate - naive_rate:+.1f} pts** |",
        "",
        f"Average delay to chosen retry window: {avg_delay:.1f}h",
        "",
        "## Honest Framing",
        "These rates come from synthetic probability functions, not real merchant data.",
        "The lift figure is the meaningful one: it shows the scheduler beats a fixed-delay",
        "policy on the same generated distribution. Absolute rates are an artifact of the",
        "generator's coefficients and should not be quoted as a revenue promise.",
        "Published real-world bands for comparison: retries-only ~30%, single-merchant smart",
        "retry ~53%, best-in-class 65–85%.",
    ]

    result = "\n".join(lines)

    if output_md:
        os.makedirs("docs", exist_ok=True)
        with open("docs/backtest_results.md", "w") as f:
            f.write(result)

    print(f"ours: {ours_rate:.1f}%  |  control({NAIVE_DELAY_HOURS}h): {naive_rate:.1f}%  "
          f"|  lift: {ours_rate - naive_rate:+.1f} pts  |  avg delay: {avg_delay:.1f}h  |  N={n}")
    return {
        "soft_total": n,
        "recovered": ours_hits,
        "recovery_rate_pct": round(ours_rate, 1),
        "control_rate_pct": round(naive_rate, 1),
        "lift_pts": round(ours_rate - naive_rate, 1),
        "avg_delay_hours": round(avg_delay, 1),
        "hard_retried": 0,
    }


if __name__ == "__main__":
    run()
