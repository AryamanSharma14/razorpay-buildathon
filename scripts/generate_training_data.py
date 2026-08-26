"""Generate 10k synthetic training rows for retry success prediction.

Every coefficient below is a DECLARED ASSUMPTION shaped by docs/research-brief.md,
not measured merchant data. The temporal curve is the load-bearing one: insufficient-funds
recoveries cluster 1-7 days out, so a scheduler that cannot express elapsed time cannot
find them regardless of how wide its search window is.
"""
import random
import csv
import os

random.seed(42)

METHODS = ["card", "upi", "netbanking"]
REASONS = [
    "insufficient_funds", "payment_failed", "payment_timeout",
    "do_not_honor", "issuer_down", "gateway_error"
]
NETWORKS = ["Visa", "MasterCard", "RuPay", "Amex"]
CARD_TYPES = ["credit", "debit", "prepaid"]
ISSUERS = ["HDFC", "ICICI", "SBIN", "UTIB", "KKBK", "PUNB", "OTHER"]

MAX_HOURS = 240

# Relative recovery likelihood by elapsed hours since failure. Keys are the upper bound
# of each bucket; insufficient_funds is deliberately suppressed same-day and peaks across
# days 2-7, matching the ~8% same-day / >60% within 1-7d / 90% within 10d distribution.
_SLOW_CURVE = [(24, 0.35), (48, 0.85), (120, 1.00), (168, 0.90), (240, 0.55)]
_FAST_CURVE = [(24, 1.00), (48, 0.70), (120, 0.45), (168, 0.30), (240, 0.20)]
_FLAT_CURVE = [(24, 0.85), (48, 1.00), (120, 0.85), (168, 0.65), (240, 0.45)]

_ISSUER_LIFT = {"HDFC": 0.04, "ICICI": 0.03, "SBIN": -0.03, "UTIB": 0.01,
                "KKBK": 0.02, "PUNB": -0.05, "OTHER": 0.0}

# Salary/payday deposit windows: Friday (dow=4), and 1st/15th of month (simulated as is_payday flag).
# Omesta study: payday-aligned retries show 3.2x recovery vs aggregate ML for insufficient_funds.
# We encode this as a binary feature so the model can learn it.
_PAYDAY_DOWS = {4}  # Friday


def _curve_for(reason):
    if reason == "insufficient_funds":
        return _SLOW_CURVE
    if reason in ("payment_timeout", "issuer_down", "gateway_error"):
        return _FAST_CURVE
    return _FLAT_CURVE


def time_multiplier(reason, hours_since):
    for upper, mult in _curve_for(reason):
        if hours_since <= upper:
            return mult
    return _curve_for(reason)[-1][1]


def success_prob(hour, dow, method, international, reason, amount_bucket,
                 hours_since=24, network="Visa", card_type="credit", issuer="OTHER",
                 is_payday=0):
    p = 0.6
    if reason == "insufficient_funds":
        p = 0.70 if dow <= 2 else 0.58
        p += 0.12 if 9 <= hour <= 11 else 0.0
        # Salary/deposit lands on payday — card balance refills, making retry more likely.
        if is_payday:
            p += 0.18
    elif reason in ("payment_timeout", "issuer_down", "gateway_error"):
        p = 0.82
    elif reason == "do_not_honor":
        p = 0.60
    elif reason == "payment_failed":
        p = 0.65

    if hour < 6 or hour > 22:
        p -= 0.12
    if international:
        p -= 0.08
    if method == "upi":
        p += 0.06
    if amount_bucket >= 4:
        p -= 0.10

    if method == "card":
        # Credit lines refill on billing cycle, debit only on salary credit — so debit
        # carries the bigger penalty precisely on insufficient_funds.
        if card_type == "credit":
            p += 0.05
        elif card_type == "debit":
            p -= 0.04 if reason == "insufficient_funds" else 0.0
        else:
            p -= 0.06
        if network == "Amex":
            p -= 0.07
        elif network == "RuPay":
            p += 0.02
        p += _ISSUER_LIFT.get(issuer, 0.0)

    p *= time_multiplier(reason, hours_since)
    return max(0.02, min(0.95, p))


def amount_bucket(amount_paise):
    if amount_paise < 10000:
        return 0
    if amount_paise < 50000:
        return 1
    if amount_paise < 200000:
        return 2
    if amount_paise < 1000000:
        return 3
    return 4


def main():
    rows = []
    for _ in range(10000):
        hour = random.randint(0, 23)
        dow = random.randint(0, 6)
        hours_since = random.randint(1, MAX_HOURS)
        method = random.choice(METHODS)
        intl = random.choice([0, 1, 1, 1, 1, 1, 1, 1, 1, 1])  # 10% international
        reason = random.choice(REASONS)
        amt = random.choice([5000, 10000, 50000, 100000, 500000, 2000000])
        ab = amount_bucket(amt)
        network = random.choice(NETWORKS) if method == "card" else "none"
        card_type = random.choice(CARD_TYPES) if method == "card" else "none"
        issuer = random.choice(ISSUERS) if method == "card" else "none"

        # Payday: Friday or 1st/15th of month. 1st/15th are ~2/30 days each → ~13% combined.
        # Encode Friday from dow; 1st/15th simulated as independent flag.
        is_payday = int(dow in _PAYDAY_DOWS or random.random() < 0.13)
        p = success_prob(hour, dow, method, intl, reason, ab,
                         hours_since, network, card_type, issuer, is_payday)
        label = 1 if random.random() < p else 0
        rows.append([hour, dow, hours_since, method, intl, reason, ab,
                     network, card_type, issuer, is_payday, label])

    os.makedirs("data", exist_ok=True)
    with open("data/training.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["hour_of_day", "day_of_week", "hours_since_failure", "method",
                    "international", "error_reason", "amount_bucket",
                    "card_network", "card_type", "card_issuer", "is_payday", "retry_success"])
        w.writerows(rows)

    print(f"Generated {len(rows)} rows -> data/training.csv")


if __name__ == "__main__":
    main()
