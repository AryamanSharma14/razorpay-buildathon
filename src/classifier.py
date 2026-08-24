HARD_REASONS = {
    "card_expired", "incorrect_card_details",
    "card_not_supported", "invalid_account"
}

SOFT_REASONS = {
    "insufficient_funds", "payment_failed", "payment_timeout",
    "do_not_honor", "issuer_down", "gateway_error"
}


def classify(error_source: str, error_step: str, error_reason: str) -> dict:
    reason = (error_reason or "").lower()
    source = (error_source or "").lower()

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
