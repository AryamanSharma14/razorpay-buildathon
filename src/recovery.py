"""Recovery action: create Razorpay Payment Link + send nudge."""
import time
from datetime import datetime, timedelta

import httpx

from src import config, db
from src import scheduler as sched

MAX_ATTEMPTS = 3
RAZORPAY_LINKS_URL = "https://api.razorpay.com/v1/payment_links"


def create_payment_link(event: dict) -> dict:
    pid = event["payment_id"]

    if not config.RAZORPAY_KEY_ID or not config.RAZORPAY_KEY_SECRET:
        mock_id = f"plink_mock_{pid}"
        db.log_audit(pid, "link_mock", "no Razorpay keys")
        return {"id": mock_id, "short_url": "https://rzp.io/i/mock"}

    body = {
        "amount": event["amount_paise"],
        "currency": event.get("currency", "INR"),
        "customer": {
            "email": event.get("email") or "",
            "contact": event.get("contact") or "",
        },
        "notify": {"sms": True, "email": True},
        "reminder_enable": True,
        "notes": {"recovery_for": pid},
        "description": f"Recovery for failed payment {pid}",
    }

    resp = httpx.post(
        RAZORPAY_LINKS_URL,
        json=body,
        auth=(config.RAZORPAY_KEY_ID, config.RAZORPAY_KEY_SECRET),
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    db.log_audit(pid, "link_created", data.get("id", ""))
    return {"id": data["id"], "short_url": data["short_url"]}


def run_recovery(payment_id: str):
    event = db.get_event(payment_id)
    if not event:
        return

    # Guards: never retry hard, already recovered, or cancelled
    if event.get("classification") == "hard":
        db.log_audit(payment_id, "hard_guard", "hard-decline recovery blocked")
        return
    if event.get("recovered"):
        db.log_audit(payment_id, "already_recovered", "skip")
        return
    if event.get("merchant_cancelled"):
        db.log_audit(payment_id, "cancelled_guard", "merchant cancelled")
        return

    attempts = (event.get("attempts") or 0) + 1
    db.update_event(payment_id, attempts=attempts)
    db.log_audit(payment_id, "recovery_attempt", f"attempt={attempts}")

    try:
        link = create_payment_link(event)
    except Exception as e:
        db.log_audit(payment_id, "link_error", str(e)[:200])
        return

    db.update_event(payment_id, payment_link_id=link["id"], payment_link_url=link["short_url"])

    # Send nudge (imported here to avoid circular at module level)
    try:
        from src.nudge import send as nudge_send
        nudge_send(event, link["short_url"])
    except Exception as e:
        db.log_audit(payment_id, "nudge_error", str(e)[:200])

    # Reschedule if under cap and not yet recovered
    if attempts < MAX_ATTEMPTS:
        prediction = sched.predict_retry_window({
            "method": event.get("method", "card"),
            "international": bool(event.get("international")),
            "error_reason": event.get("error_reason", "payment_failed"),
            "amount_paise": event.get("amount_paise", 0),
        })
        sched.schedule_retry(payment_id, prediction["delay_hours"])
    else:
        db.log_audit(payment_id, "give_up", f"max attempts ({MAX_ATTEMPTS}) reached")
