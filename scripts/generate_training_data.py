"""Generate 10k synthetic training rows for retry success prediction."""
import random
import csv
import os

random.seed(42)

METHODS = ["card", "upi", "netbanking"]
REASONS = [
    "insufficient_funds", "payment_failed", "payment_timeout",
    "do_not_honor", "issuer_down", "gateway_error"
]


def success_prob(hour, dow, method, international, reason, amount_bucket):
    p = 0.5
    if reason == "insufficient_funds":
        # month-start (approx dow 0-2) and morning improve odds
        p = 0.55 if dow <= 2 else 0.45
        p += 0.1 if 9 <= hour <= 11 else 0.0
    elif reason in ("payment_timeout", "issuer_down", "gateway_error"):
        p = 0.70  # transient, high retry success
    elif reason == "do_not_honor":
        p = 0.45
    elif reason == "payment_failed":
        p = 0.50
    if hour < 6 or hour > 22:
        p -= 0.1
    if international:
        p -= 0.1
    if method == "upi":
        p += 0.05
    if amount_bucket >= 4:
        p -= 0.1
    return max(0.05, min(0.95, p))


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


rows = []
for _ in range(10000):
    hour = random.randint(0, 23)
    dow = random.randint(0, 6)
    method = random.choice(METHODS)
    intl = random.choice([0, 1, 1, 1, 1, 1, 1, 1, 1, 1])  # 10% international
    reason = random.choice(REASONS)
    amt = random.choice([5000, 10000, 50000, 100000, 500000, 2000000])
    ab = amount_bucket(amt)
    p = success_prob(hour, dow, method, intl, reason, ab)
    label = 1 if random.random() < p else 0
    rows.append([hour, dow, method, intl, reason, ab, label])

os.makedirs("data", exist_ok=True)
with open("data/training.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["hour_of_day", "day_of_week", "method", "international",
                "error_reason", "amount_bucket", "retry_success"])
    w.writerows(rows)

print(f"Generated {len(rows)} rows -> data/training.csv")
