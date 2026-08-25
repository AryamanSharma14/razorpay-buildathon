"""Recovery action: create Razorpay Payment Link + send nudge."""
import time
from datetime import datetime, timedelta

import httpx

from src import compliance, config, db
from src import scheduler as sched

MAX_ATTEMPTS = 3
RAZORPAY_LINKS_URL = "https://api.razorpay.com/v1/payment_links"

# Card declines on a fundable/issuer reason: route recovery to UPI Autopay — a different
# rail off the failing card network. Hard declines never reach rail selection (guarded upstream).
RAIL_ROUTABLE = {"insufficient_funds", "issuer_down", "do_not_honor"}


def select_rail(event: dict) -> str:
    """Recovery rail for this event. Returns 'upi' when a card decline is routed off-network,
    else the original method. Only card payments on a RAIL_ROUTABLE reason reroute."""
    method = event.get("method") or "card"
    if method == "card" and (event.get("error_reason") or "") in RAIL_ROUTABLE:
        return "upi"
    return method


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

    if event.get("chosen_rail") == "upi":
        body["options"] = {"checkout": {"method": {"upi": "1"}}}

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

    allowed, why = compliance.check_retry_allowed(event)
    if not allowed:
        db.log_audit(payment_id, "network_cap_block", why)
        return
    compliance.record_attempt(event)

    attempts = (event.get("attempts") or 0) + 1
    db.update_event(payment_id, attempts=attempts)
    db.log_audit(payment_id, "recovery_attempt", f"attempt={attempts}")

    rail = select_rail(event)
    event["chosen_rail"] = rail
    if rail != (event.get("method") or "card"):
        db.update_event(payment_id, chosen_rail=rail)
        db.log_audit(payment_id, "rail_routed", f"{event.get('error_reason')}->{rail}")

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
            "card_network": event.get("card_network"),
            "card_type": event.get("card_type"),
            "card_issuer": event.get("card_issuer"),
        })
        sched.schedule_retry(payment_id, prediction["delay_hours"])
    else:
        db.log_audit(payment_id, "give_up", f"max attempts ({MAX_ATTEMPTS}) reached")
