def classify_trajectory(history: list[dict]) -> str:
    """Classify decline trajectory from ordered history of error_reason strings.
    Returns: 'ok' | 'trajectory_escalating' | 'trajectory_stuck'
    """
    reasons = [h.get("error_reason", "") or "" for h in history]
    if len(reasons) < 2:
        return "ok"
    # Escalating: soft→hard signal (bank refusing more firmly)
    pairs = list(zip(reasons, reasons[1:]))
    for a, b in pairs:
        if a == "insufficient_funds" and b == "do_not_honor":
            return "trajectory_escalating"
    # Stuck: same code repeated 3+ times
    if len(reasons) >= 3 and len(set(reasons[-3:])) == 1:
        return "trajectory_stuck"
    return "ok"


HARD_REASONS = {
    "card_expired", "incorrect_card_details",
    "card_not_supported", "invalid_account"
}

SOFT_REASONS = {
    "insufficient_funds", "payment_failed", "payment_timeout",
    "do_not_honor", "issuer_down", "gateway_error"
}


def classify(error_source: str, error_step: str, error_reason: str,
             method: str = "", issuer: str = "") -> dict:
    reason = (error_reason or "").lower()
    source = (error_source or "").lower()
    step = (error_step or "").lower()

    # OTP/3DS abandoned: customer dropped at authentication — high recovery priority, fast retry
    if reason in ("payment_cancelled", "user_dropped") and step == "payment_authentication":
        return {
            "type": "soft",
            "reason": "abandoned_otp: customer dropped at authentication",
            "action": "schedule_retry",
            "fast_retry": True,  # signals 15–30 min window
        }

    # Hard reasons take absolute priority — never reclassified as infrastructure
    if reason in HARD_REASONS or source == "customer" and reason in HARD_REASONS:
        return {
            "type": "hard",
            "reason": f"permanent decline: {reason}",
            "action": "request_card_update"
        }

    if source == "customer" and reason not in SOFT_REASONS:
        return {
            "type": "hard",
            "reason": f"customer-sourced unknown reason: {reason}",
            "action": "request_card_update"
        }

    # Infrastructure: failure matches active downtime — park, don't schedule ML timer
    if method and issuer:
        from src import db as _db
        if _db.active_downtime_for(method, issuer):
            return {
                "type": "infrastructure",
                "reason": f"active downtime: {method}/{issuer}",
                "action": "queue_for_downtime"
            }

    if reason in SOFT_REASONS or source in ("bank", "gateway"):
        return {
            "type": "soft",
            "reason": f"transient decline: {reason or source}",
            "action": "schedule_retry"
        }

    return {
        "type": "soft",
        "reason": f"unknown reason (defaulting soft, low confidence): {reason}",
        "action": "schedule_retry",
        "low_confidence": True
    }
