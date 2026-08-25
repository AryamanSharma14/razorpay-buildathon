import hashlib
import hmac
import json
from datetime import datetime

from fastapi import APIRouter, Request, Response
from src import compliance, config, db
from src.classifier import classify
from src import scheduler as sched

router = APIRouter()


def _verify_sig(body: bytes, sig: str) -> bool:
    secret = config.RAZORPAY_WEBHOOK_SECRET.encode()
    expected = hmac.new(secret, body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig or "")


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    skip_sig = request.query_params.get("skip_sig") == "1"

    if not skip_sig or not config.DEMO_MODE:
        if not _verify_sig(body, sig):
            return Response(status_code=401, content="Invalid signature")

    payload = json.loads(body)
    event = payload.get("event")

    if event == "payment.failed":
        _handle_payment_failed(payload)
    elif event == "payment_link.paid":
        _handle_link_paid(payload)

    return {"status": "ok"}


def _handle_payment_failed(payload: dict):
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    pid = entity.get("id")
    if not pid:
        return

    existing = db.get_event(pid)
    if existing:
        db.log_audit(pid, "duplicate", "webhook received again")
        return

    result = classify(
        entity.get("error_source", ""),
        entity.get("error_step", ""),
        entity.get("error_reason", ""),
    )

    card = entity.get("card") or {}
    row = {
        "payment_id": pid,
        "order_id": entity.get("order_id"),
        "amount_paise": entity.get("amount", 0),
        "currency": entity.get("currency", "INR"),
        "email": entity.get("email"),
        "contact": entity.get("contact"),
        "error_source": entity.get("error_source"),
        "error_step": entity.get("error_step"),
        "error_reason": entity.get("error_reason"),
        "error_code": entity.get("error_code"),
        "method": entity.get("method", "card"),
        "international": int(bool(entity.get("international"))),
        "card_network": card.get("network"),
        "card_type": card.get("type"),
        "card_issuer": card.get("issuer"),
        "card_iin": card.get("iin"),
        "classification": result["type"],
        "classify_reason": result["reason"],
        "raw_payload": json.dumps(payload),
    }
    row["credential"] = compliance.credential_of({**row})

    db.insert_event(row)
    db.log_audit(pid, "classified", result["reason"])

    if result["type"] == "hard":
        db.log_audit(pid, "hard_stop", "no retry scheduled")
        return

    allowed, why = compliance.check_retry_allowed(row)
    if not allowed:
        db.log_audit(pid, "network_cap_block", why)
        return

    # soft: ML predict retry window, schedule
    prediction = sched.predict_retry_window({
        "method": row["method"],
        "international": row["international"],
        "error_reason": entity.get("error_reason", "payment_failed"),
        "amount_paise": entity.get("amount", 0),
        "card_network": row["card_network"],
        "card_type": row["card_type"],
        "card_issuer": row["card_issuer"],
    })
    db.update_event(
        pid,
        confidence=prediction["confidence"],
        top_features=json.dumps(prediction["top_features"]),
    )
    sched.schedule_retry(pid, prediction["delay_hours"])


def _handle_link_paid(payload: dict):
    entity = payload.get("payload", {}).get("payment_link", {}).get("entity", {})
    notes = entity.get("notes", {})
    pid = notes.get("recovery_for")
    if not pid:
        return

    now = datetime.utcnow().isoformat()
    db.update_event(pid, recovered=1, recovered_at=now)
    db.log_audit(pid, "recovered", "payment_link.paid webhook")
