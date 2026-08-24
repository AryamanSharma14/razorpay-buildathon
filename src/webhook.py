import hashlib
import hmac
import json
from datetime import datetime

from fastapi import APIRouter, Request, Response
from src import config, db
from src.classifier import classify

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
        "classification": result["type"],
        "classify_reason": result["reason"],
        "raw_payload": json.dumps(payload),
    }

    db.insert_event(row)
    db.log_audit(pid, "classified", result["reason"])

    if result["type"] == "hard":
        db.log_audit(pid, "hard_stop", "no retry scheduled")


def _handle_link_paid(payload: dict):
    entity = payload.get("payload", {}).get("payment_link", {}).get("entity", {})
    notes = entity.get("notes", {})
    pid = notes.get("recovery_for")
    if not pid:
        return

    now = datetime.utcnow().isoformat()
    db.update_event(pid, recovered=1, recovered_at=now)
    db.log_audit(pid, "recovered", "payment_link.paid webhook")
