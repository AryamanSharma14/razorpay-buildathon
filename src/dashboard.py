"""Dashboard API routes + stats."""
import json
import os
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

from src import db
from src import scheduler as sched

router = APIRouter()

_HTML = Path(__file__).parent / "web" / "dashboard.html"


@router.get("/")
def serve_dashboard():
    return FileResponse(str(_HTML))


@router.get("/dashboard/stats")
def stats():
    events = db.all_events()

    total = len(events)
    soft = [e for e in events if e.get("classification") == "soft"]
    hard = [e for e in events if e.get("classification") == "hard"]
    recovered = [e for e in events if e.get("recovered")]
    cancelled = [e for e in events if e.get("merchant_cancelled")]

    pending = [
        e for e in soft
        if not e.get("recovered") and not e.get("merchant_cancelled") and e.get("retry_at")
    ]

    recovery_rate = round(len(recovered) / len(soft) * 100, 1) if soft else 0.0
    revenue_recovered_inr = sum(e.get("amount_paise", 0) for e in recovered) / 100

    channels = {}
    for e in events:
        ch = e.get("nudge_channel")
        if ch:
            channels[ch] = channels.get(ch, 0) + 1

    pending_rows = []
    for e in pending:
        top_f = e.get("top_features")
        try:
            top_f = json.loads(top_f) if top_f else []
        except Exception:
            top_f = []
        pending_rows.append({
            "payment_id": e["payment_id"],
            "amount_inr": e["amount_paise"] / 100,
            "retry_at": e.get("retry_at"),
            "classify_reason": e.get("classify_reason"),
            "confidence": e.get("confidence"),
            "top_features": top_f,
            "nudge_reasoning": e.get("nudge_reasoning"),
            "nudge_message": e.get("nudge_message"),
            "payment_link_url": e.get("payment_link_url"),
        })

    return {
        "total_failed": total,
        "soft": len(soft),
        "hard": len(hard),
        "retries_scheduled": len(pending),
        "recovered": len(recovered),
        "merchant_cancelled": len(cancelled),
        "recovery_rate_pct": recovery_rate,
        "revenue_recovered_inr": revenue_recovered_inr,
        "channel_breakdown": channels,
        "pending_retries": pending_rows,
    }


@router.get("/backtest")
def backtest():
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    try:
        from scripts.backtest import run
        return run(output_md=False)
    except Exception as e:
        return {"error": str(e)}


@router.delete("/retry/{payment_id}")
def cancel_retry(payment_id: str):
    try:
        sched.scheduler.remove_job(payment_id)
    except Exception:
        pass

    db.update_event(payment_id, merchant_cancelled=1)
    db.log_audit(payment_id, "merchant_cancelled", "manual cancel via dashboard")
    return {"cancelled": True}
