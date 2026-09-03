"""
Multi-policy backtest. Same circular-validation caveat applies: ground truth is the
same probability function used to generate training labels. Proves scheduler beats
fixed-delay on this distribution; not evidence about real merchants.
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
random.seed(42)

# Network fine per excess attempt (declared assumption — domestic INR equivalent)
VISA_CAP_30D = 20
VISA_FINE_INR = 8.0       # ~$0.10 domestic
MC_CAP_24H = 10
MC_FINE_INR = 20.0        # ~$0.25 cross-border proxy


def _enc(bundle, key, v, fallback):
    e = bundle[key]
    try:
        return e.transform([str(v)])[0]
    except Exception:
        return e.transform([fallback])[0]


def _ml_best_hour(clf, bundle, row, now):
    hours = np.arange(1, MAX_HORIZON_HOURS + 1)
    futures = [now + timedelta(hours=int(h)) for h in hours]
    reason, method = row["error_reason"], row["method"]
    intl, amt = int(row["international"]), int(row["amount_bucket"])
    network, ctype, issuer = row["card_network"], row["card_type"], row["card_issuer"]
    base = [
        _enc(bundle, "method_enc", method, "card"), intl,
        _enc(bundle, "reason_enc", reason, "payment_failed"), amt,
        _enc(bundle, "card_network_enc", network, "none"),
        _enc(bundle, "card_type_enc", ctype, "none"),
        _enc(bundle, "card_issuer_enc", issuer, "none"),
    ]
    X = np.array([
        [f.hour, f.weekday(), int(h)] + base + [int(f.weekday() == 4 or f.day in (1, 15))]
        for h, f in zip(hours, futures)
    ])
    return int(hours[int(clf.predict_proba(X)[:, 1].argmax())])


def _snap_payday(delay_h, reason, now):
    """Snap insufficient_funds to next payday window (mirrors scheduler.py logic)."""
    if reason != "insufficient_funds":
        return delay_h
    fire = now + timedelta(hours=delay_h)
    if fire.weekday() == 4 or fire.day in (1, 15):
        return delay_h
    for d in range(1, 36):
        cand = fire + timedelta(days=d)
        if cand.weekday() == 4 or cand.day in (1, 15):
            return delay_h + d * 24
    return delay_h


def _simulate(delays_fn, df_test, now):
    """
    delays_fn(row) → list of delay hours to attempt (in order).
    Returns: hits, total_attempts, fines_inr, revenues_inr
    """
    hits = 0
    total_attempts = 0
    fines_inr = 0.0

    for _, row in df_test.iterrows():
        reason, method = row["error_reason"], row["method"]
        intl, amt = int(row["international"]), int(row["amount_bucket"])
        network, ctype, issuer = row["card_network"], row["card_type"], row["card_issuer"]
        amount_paise = {0: 5000, 1: 25000, 2: 100000, 3: 500000, 4: 2000000}.get(amt, 50000)

        delays = delays_fn(row)
        attempt_count = 0
        recovered = False

        for delay in delays:
            total_attempts += 1
            attempt_count += 1
            t = now + timedelta(hours=delay)
            p = success_prob(t.hour, t.weekday(), method, bool(intl), reason, amt,
                             delay, network, ctype, issuer,
                             is_payday=int(t.weekday() == 4 or t.day in (1, 15)))
            if random.random() < p:
                hits += 1
                recovered = True
                break

        # Network fines: per-payment attempt count over cap (simplified: per-credential)
        net = (network or "").lower()
        if method == "card":
            cap = VISA_CAP_30D if net == "visa" else MC_CAP_24H
            fine_rate = VISA_FINE_INR if net == "visa" else MC_FINE_INR
            excess = max(0, attempt_count - cap)
            fines_inr += excess * fine_rate

    return hits, total_attempts, fines_inr


def run(output_md=True):
    df = pd.read_csv("data/training.csv")
    _, df_test = train_test_split(df, test_size=0.2, random_state=42)

    try:
        bundle = joblib.load("models/retry_model.pkl")
        clf = bundle["model"]
        has_model = True
    except FileNotFoundError:
        has_model = False

    now = datetime.utcnow()
    n = len(df_test)

    def razorpay_default(row):
        # 3 reminders, retry at ~24h (next day), slots 11AM or 15PM only
        return [24, 48, 72]

    def naive_24h(row):
        return [24]

    def no_retry(row):
        return []

    def retry_aggressive(row):
        # 25 retries every 12h — blows Visa 20/30d cap, incurs fines per excess attempt
        return [12 * i for i in range(1, 26)]

    def ours(row):
        # 3 attempts like razorpay_default, but ML-timed across optimal horizon windows.
        # Uses GradientBoosting probability surface across 240h horizon to pick
        # top 3 distinct high-confidence slots (avoiding bank dead-zones and aligning with liquidity).
        if not has_model:
            return [24, 48, 72]
        hours = np.arange(1, MAX_HORIZON_HOURS + 1)
        futures = [now + timedelta(hours=int(h)) for h in hours]
        reason, method = row["error_reason"], row["method"]
        intl, amt = int(row["international"]), int(row["amount_bucket"])
        network, ctype, issuer = row["card_network"], row["card_type"], row["card_issuer"]
        base = [
            _enc(bundle, "method_enc", method, "card"), intl,
            _enc(bundle, "reason_enc", reason, "payment_failed"), amt,
            _enc(bundle, "card_network_enc", network, "none"),
            _enc(bundle, "card_type_enc", ctype, "none"),
            _enc(bundle, "card_issuer_enc", issuer, "none"),
        ]
        X = np.array([
            [f.hour, f.weekday(), int(h)] + base + [int(f.weekday() == 4 or f.day in (1, 15))]
            for h, f in zip(hours, futures)
        ])
        probs = clf.predict_proba(X)[:, 1]
        sorted_indices = np.argsort(-probs)
        chosen = []
        for idx in sorted_indices:
            h = int(hours[idx])
            if all(abs(h - c) >= 12 for c in chosen):
                chosen.append(h)
            if len(chosen) == 3:
                break
        return chosen if chosen else [24, 48, 72]

    policies = [
        ("no_retry",             no_retry),
        ("razorpay_default",     razorpay_default),
        ("naive_24h",            naive_24h),
        ("ours_ml_payday",       ours),
        ("retry_all_aggressive", retry_aggressive),
    ]

    results = []
    for name, fn in policies:
        hits, attempts, fines = _simulate(fn, df_test, now)
        rate = hits / n * 100
        results.append({
            "policy": name,
            "recovered": hits,
            "n": n,
            "rate_pct": round(rate, 1),
            "total_attempts": attempts,
            "fines_inr": round(fines, 2),
        })

    # Lift over razorpay_default
    baseline = next(r for r in results if r["policy"] == "razorpay_default")
    for r in results:
        r["lift_pts"] = round(r["rate_pct"] - baseline["rate_pct"], 1)

    lines = [
        "# Multi-Policy Backtest Results",
        "",
        "## Methodology",
        f"- Held-out 20% test split ({n} rows), fixed `random_state=42`",
        "- **Circular validation** — ground truth = same generator as training. Proves",
        "  scheduler finds the optimum the data encodes; not evidence about real merchants.",
        f"- Search horizon: 1–{MAX_HORIZON_HOURS}h",
        "- Baseline: `razorpay_default` (3 fixed-slot reminders, not decline-aware)",
        "- Network fines: estimated INR per attempt over Visa 20/30d or MC 10/24h cap",
        "  (declared assumptions: Visa ₹8/violation, MC ₹20/violation)",
        "",
        "## Results",
        "| Policy | Rate | Recovered | Attempts | Fines (INR) | Lift vs baseline |",
        "|---|---|---|---|---|---|",
    ]
    for r in results:
        lines.append(
            f"| {r['policy']} | {r['rate_pct']}% | {r['recovered']}/{n} "
            f"| {r['total_attempts']} | ₹{r['fines_inr']} | {r['lift_pts']:+.1f} pts |"
        )

    lines += [
        "",
        "## Honest Framing",
        "Absolute rates are artifacts of the generator's coefficients.",
        "Lift over razorpay_default is the load-bearing number.",
        "Real-world bands (not ours): aggregate ML 22–40%, best-in-class 45–60%.",
        "These rates must always be cited as synthetic alongside the control.",
    ]

    result_md = "\n".join(lines)
    if output_md:
        os.makedirs("docs", exist_ok=True)
        with open("docs/backtest_results.md", "w", encoding="utf-8") as f:
            f.write(result_md)

    # Print summary
    for r in results:
        print(f"{r['policy']:25s}  rate={r['rate_pct']:5.1f}%  "
              f"fines=INR{r['fines_inr']:8.2f}  lift={r['lift_pts']:+.1f}pts")

    # Return shape expected by /backtest endpoint and tests
    ours_r = next(r for r in results if r["policy"] == "ours_ml_payday")
    agg_r = next(r for r in results if r["policy"] == "razorpay_default")
    aggressive_r = next(r for r in results if r["policy"] == "retry_all_aggressive")

    return {
        "soft_total": n,
        "recovered": ours_r["recovered"],
        "recovery_rate_pct": ours_r["rate_pct"],
        "control_rate_pct": agg_r["rate_pct"],
        "lift_pts": ours_r["lift_pts"],
        "hard_retried": 0,
        "policies": results,
        "aggressive_fines_inr": aggressive_r["fines_inr"],
        "ours_fines_inr": ours_r["fines_inr"],
    }


if __name__ == "__main__":
    run()
