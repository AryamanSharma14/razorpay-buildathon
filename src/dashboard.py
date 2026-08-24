"""Dashboard API routes."""
from fastapi import APIRouter
from src import db
from src import scheduler as sched

router = APIRouter()


@router.delete("/retry/{payment_id}")
def cancel_retry(payment_id: str):
    try:
        sched.scheduler.remove_job(payment_id)
    except Exception:
        pass  # job already fired or doesn't exist — idempotent

    db.update_event(payment_id, merchant_cancelled=1)
    db.log_audit(payment_id, "merchant_cancelled", "manual cancel via dashboard")
    return {"cancelled": True}
