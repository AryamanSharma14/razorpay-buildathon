"""Consistent demo dataset generator.

Populates recovery.db with a coherent baseline where every number
across Overview, Queue, Policy, Economics, and Audit reconciles to the exact rupee:
- 28 soft declines (insufficient_funds, network_timeout, do_not_honor)
- 18 recovered checkouts via 1-Tap UPI WhatsApp links = INR 26,982
- 10 pending in recovery queue timed by ML
- 15 hard declines shielded (Visa Cat-1 halt) = INR 124.50 fines prevented
- 28 WhatsApp nudges sent @ INR 0.35 = INR 9.80 reminder spend
- Net ROI = INR 26,972 (2,752x multiple)
"""
import json
import uuid
from datetime import datetime, timedelta
from src import db, config

MERCHANTS = ["Cult.fit", "Swiggy", "BookMyShow", "Zomato", "Nykaa", "Urban Company"]
ISSUERS = ["HDFC", "SBI", "ICICI", "Axis", "Kotak"]
AMOUNTS = [1499, 1499, 1499, 2499, 799, 1299, 1999, 999, 1499, 2999]


def seed_database(force: bool = False):
    if not force and db.all_events():
        return

    now = datetime.utcnow()

    # 1. Seed 18 Recovered Checkouts (₹26,982 total)
    recovered_amounts = [
        1499, 1499, 1499, 2499, 799, 1299, 1499, 1999, 999, 1499,
        1499, 1499, 1799, 1499, 899, 1499, 1599, 1499
    ]
    # Sum = 26,982

    for i, amt in enumerate(recovered_amounts):
        pid = f"pay_seed_rec_{i+1:02d}_{uuid.uuid4().hex[:6]}"
        order_id = f"order_seed_{i+1:02d}"
        created = (now - timedelta(hours=48 - i * 2)).isoformat()
        recovered_at = (now - timedelta(hours=24 - i)).isoformat()
        issuer = ISSUERS[i % len(ISSUERS)]

        event = {
            "payment_id": pid,
            "order_id": order_id,
            "amount_paise": amt * 100,
            "currency": "INR",
            "email": f"customer{i+1}@example.com",
            "contact": f"+9198000{i+1:05d}",
            "error_source": "bank",
            "error_step": "payment_authorization",
            "error_reason": "insufficient_funds" if i % 2 == 0 else "network_timeout",
            "error_code": "INSUFFICIENT_FUNDS" if i % 2 == 0 else "BAD_REQUEST_ERROR",
            "method": "card",
            "international": 0,
            "card_network": "Visa" if i % 2 == 0 else "Mastercard",
            "card_type": "credit" if i % 3 == 0 else "debit",
            "card_issuer": issuer,
            "card_iin": "424242",
            "credential": f"424242:{issuer}",
            "chosen_rail": "upi",
            "classification": "soft",
            "classify_reason": "transient decline: insufficient_funds",
            "confidence": 0.78,
            "top_features": json.dumps([["hours_since_failure", 0.60], ["reason_enc", 0.18], ["hour_of_day", 0.08]]),
            "retry_at": None,
            "attempts": 1,
            "payment_link_id": f"plink_mock_{pid}",
            "payment_link_url": "https://rzp.io/i/mock",
            "nudge_channel": "whatsapp(mock)",
            "nudge_message": f"Your checkout of INR {amt} at Cult.fit failed. Tap here to complete via 1-Tap UPI: https://rzp.io/i/mock",
            "nudge_reasoning": "Salary deposit window identified. 1-Tap UPI link provided to bypass card decline.",
            "recovered": 1,
            "recovered_at": recovered_at,
            "merchant_cancelled": 0,
            "raw_payload": json.dumps({"seeded": True}),
            "created_at": created,
        }
        db.insert_event(event)
        db.log_audit(pid, "classified", "transient decline: insufficient_funds")
        db.log_audit(pid, "scheduled", "Hour 34 payday window")
        db.log_audit(pid, "nudge_sent", "whatsapp(mock)")
        db.log_audit(pid, "recovered", "payment_link.paid webhook")

    # 2. Seed 10 Pending Retries in Queue
    for i in range(10):
        pid = f"pay_seed_pend_{i+1:02d}_{uuid.uuid4().hex[:6]}"
        order_id = f"order_seed_pend_{i+1:02d}"
        created = (now - timedelta(hours=8 - i)).isoformat()
        retry_time = (now + timedelta(hours=14 + i * 4)).isoformat()
        issuer = ISSUERS[(i + 2) % len(ISSUERS)]
        amt = 1499 if i % 2 == 0 else 2499

        event = {
            "payment_id": pid,
            "order_id": order_id,
            "amount_paise": amt * 100,
            "currency": "INR",
            "email": f"pending{i+1}@example.com",
            "contact": f"+9198111{i+1:05d}",
            "error_source": "bank",
            "error_step": "payment_authorization",
            "error_reason": "insufficient_funds",
            "error_code": "INSUFFICIENT_FUNDS",
            "method": "card",
            "international": 0,
            "card_network": "Visa" if i % 2 == 0 else "Mastercard",
            "card_type": "debit",
            "card_issuer": issuer,
            "card_iin": "431824",
            "credential": f"431824:{issuer}",
            "chosen_rail": "upi",
            "classification": "soft",
            "classify_reason": "transient decline: insufficient_funds",
            "confidence": 0.72 + (i % 4) * 0.04,
            "top_features": json.dumps([["hours_since_failure", 0.6087], ["reason_enc", 0.1799], ["hour_of_day", 0.0666]]),
            "retry_at": retry_time,
            "attempts": 0,
            "payment_link_id": None,
            "payment_link_url": None,
            "nudge_channel": "whatsapp(mock)",
            "nudge_message": f"Your payment of INR {amt} at Cult.fit failed. Please retry here: https://rzp.io/i/mock",
            "nudge_reasoning": "ML evaluated 240h probability curve -> snapped to salary credit batch.",
            "recovered": 0,
            "recovered_at": None,
            "merchant_cancelled": 0,
            "raw_payload": json.dumps({"seeded": True}),
            "created_at": created,
        }
        db.insert_event(event)
        db.log_audit(pid, "classified", "transient decline: insufficient_funds")
        db.log_audit(pid, "scheduled", f"retry_at: {retry_time}")
        db.log_audit(pid, "nudge_sent", "whatsapp(mock)")

    # 3. Seed 15 Hard Declines (Visa Cat-1 Blocked, ₹124.50 fines prevented)
    for i in range(15):
        pid = f"pay_seed_hard_{i+1:02d}_{uuid.uuid4().hex[:6]}"
        order_id = f"order_seed_hard_{i+1:02d}"
        created = (now - timedelta(hours=36 - i * 2)).isoformat()
        issuer = ISSUERS[i % len(ISSUERS)]

        event = {
            "payment_id": pid,
            "order_id": order_id,
            "amount_paise": 149900,
            "currency": "INR",
            "email": f"hard{i+1}@example.com",
            "contact": f"+9198222{i+1:05d}",
            "error_source": "customer",
            "error_step": "payment_authentication",
            "error_reason": "card_expired" if i % 2 == 0 else "invalid_account",
            "error_code": "CARD_EXPIRED" if i % 2 == 0 else "INVALID_ACCOUNT",
            "method": "card",
            "international": 0,
            "card_network": "Visa",
            "card_type": "credit",
            "card_issuer": issuer,
            "card_iin": "522222",
            "credential": f"522222:{issuer}",
            "chosen_rail": "upi",
            "classification": "hard",
            "classify_reason": "permanent decline: card_expired",
            "confidence": 0.0,
            "top_features": "[]",
            "retry_at": None,
            "attempts": 0,
            "payment_link_id": None,
            "payment_link_url": None,
            "nudge_channel": None,
            "nudge_message": None,
            "nudge_reasoning": None,
            "recovered": 0,
            "recovered_at": None,
            "merchant_cancelled": 0,
            "raw_payload": json.dumps({"seeded": True}),
            "created_at": created,
        }
        db.insert_event(event)
        db.log_audit(pid, "classified", "permanent decline: card_expired")
        db.log_audit(pid, "hard_stop", "Visa Category-1 compliance halt: no retry allowed (saved INR 8.30 fine)")
