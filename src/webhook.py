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

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        db.log_audit("system", "malformed_json", "webhook body not valid JSON")
        return Response(status_code=400, content="Invalid JSON")
    event = payload.get("event")

    if event == "payment.failed":
        _handle_payment_failed(payload)
    elif event == "payment_link.paid":
        _handle_link_paid(payload)
    elif event in ("payment.downtime.started", "payment.downtime.updated"):
        _handle_downtime_started(payload)
    elif event == "payment.downtime.resolved":
        _handle_downtime_resolved(payload)

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
        method=entity.get("method", ""),
        issuer=(entity.get("card") or {}).get("issuer", ""),
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

    if result["type"] == "infrastructure":
        dt = db.active_downtime_for(row["method"], row.get("card_issuer") or "")
        if dt:
            db.queue_for_downtime(pid, dt["id"])
            db.log_audit(pid, "downtime_queued", f"method={row['method']} issuer={row.get('card_issuer')}")
        return

    allowed, why = compliance.check_retry_allowed(row)
    if not allowed:
        db.log_audit(pid, "network_cap_block", why)
        return

    # soft: ML predict retry window, schedule (OTP abandoned gets fast 30-min retry)
    if result.get("fast_retry"):
        prediction = {"delay_hours": 0.5, "confidence": 0.8, "top_features": [["abandoned_otp", 1.0]]}
        db.log_audit(pid, "otp_fast_retry", "customer dropped at authentication, 30-min retry")
    else:
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
    sched.schedule_retry(pid, prediction["delay_hours"], error_reason=entity.get("error_reason", ""),
                         issuer=row.get("card_issuer") or "", method=row.get("method") or "card")


def _handle_downtime_started(payload: dict):
    entity = payload.get("payload", {}).get("downtime", {}).get("entity", {})
    method = entity.get("method", "")
    issuer = entity.get("instrument", {}).get("issuer", "")
    now = datetime.utcnow().isoformat()
    if method and not db.active_downtime_for(method, issuer):
        db.insert_downtime(method, issuer, now)
        db.log_audit("system", "downtime_started", f"{method}/{issuer}")


def _handle_downtime_resolved(payload: dict):
    entity = payload.get("payload", {}).get("downtime", {}).get("entity", {})
    method = entity.get("method", "")
    issuer = entity.get("instrument", {}).get("issuer", "")
    now = datetime.utcnow().isoformat()
    db.resolve_downtime(method, issuer, now)
    db.log_audit("system", "downtime_resolved", f"{method}/{issuer}")

    # Drain queued payments → fire recovery for each
    pids = db.drain_downtime_queue(method, issuer)
    from src.recovery import run_recovery
    for pid in pids:
        db.log_audit(pid, "downtime_drain", f"resolved {method}/{issuer}")
        run_recovery(pid)


def _handle_link_paid(payload: dict):
    entity = payload.get("payload", {}).get("payment_link", {}).get("entity", {})
    notes = entity.get("notes", {})
    pid = notes.get("recovery_for")
    if not pid:
        return

    existing = db.get_event(pid)
    if existing and existing.get("recovered"):
        db.log_audit(pid, "duplicate_paid", "already recovered, ignoring replay")
        return

    now = datetime.utcnow().isoformat()
    db.update_event(pid, recovered=1, recovered_at=now)
    db.log_audit(pid, "recovered", "payment_link.paid webhook")
