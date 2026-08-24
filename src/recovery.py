"""Recovery action: create Razorpay Payment Link + send nudge."""
# Stub — implemented in Stage 4
from src import db


def run_recovery(payment_id: str):
    db.log_audit(payment_id, "recovery_stub", "Stage 4 not yet implemented")
