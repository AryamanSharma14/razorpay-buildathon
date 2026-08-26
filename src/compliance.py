"""Card-network retry caps. Counted per credential, per rolling window.

Visa: 20 attempts per rolling 30 days (raised from 15 on 2025-05-19).
Mastercard: 10 per 24h and 35 per 30 days, enforced via Transaction Processing Excellence.
Unknown networks fall back to the strictest published limits.
See docs/research-brief.md.
"""
from datetime import datetime, timedelta
from src import db

# Min hours between retries on same credential — prevents card-testing fraud signal.
MIN_RETRY_SPACING_HOURS = 24

# (hours, max_attempts) pairs per network
CAPS = {
    "visa": [(720, 20)],
    "mastercard": [(24, 10), (720, 35)],
    "rupay": [(24, 10), (720, 20)],
    "amex": [(24, 10), (720, 20)],
}
_DEFAULT_CAPS = [(24, 10), (720, 20)]


def credential_of(event: dict) -> str:
    """Stable per-instrument key. Falls back to payment_id so a missing card object never
    silently merges distinct credentials into one shared counter."""
    iin = event.get("card_iin")
    if iin:
        return f"{iin}:{event.get('card_issuer') or 'unknown'}"
    return f"pid:{event.get('payment_id')}"


def check_retry_allowed(event: dict) -> tuple[bool, str]:
    """Returns (allowed, reason). Only card retries are network-capped."""
    if (event.get("method") or "card") != "card":
        return True, "non-card rail, no network cap"

    network = (event.get("card_network") or "").lower()
    caps = CAPS.get(network, _DEFAULT_CAPS)
    cred = credential_of(event)

    for hours, limit in caps:
        used = db.count_network_attempts(cred, hours)
        if used >= limit:
            window = "24h" if hours == 24 else "30d"
            return False, f"{network or 'unknown'} cap reached: {used}/{limit} in {window}"

    # Card-testing spacing: block if last attempt too recent
    last_ts = db.last_attempt_ts(cred)
    if last_ts:
        last_dt = datetime.fromisoformat(last_ts).replace(tzinfo=None)
        if datetime.utcnow() - last_dt < timedelta(hours=MIN_RETRY_SPACING_HOURS):
            return False, f"cardtesting_spacing_block: last attempt {last_ts}"

    return True, f"within {network or 'unknown'} caps"


def check_upi_mandate_allowed(event: dict) -> tuple[bool, str]:
    """NPCI OC-98: UPI mandate failures allow max 1 re-presentation per billing cycle (30d).
    A UPI mandate failure is: method=upi and error_reason indicates mandate/subscription context."""
    if event.get("method") != "upi":
        return True, "not a UPI payment"

    mandate_signals = {"upi_mandate_failed", "mandate_execution_failed", "debit_failed"}
    reason = (event.get("error_reason") or "").lower()
    if not any(sig in reason for sig in mandate_signals):
        return True, "not a mandate failure"

    cred = credential_of(event)
    # Mandate: max 1 retry per 30-day window
    used = db.count_network_attempts(cred, 720)
    if used >= 1:
        return False, f"upi_mandate_cycle_block: {used} attempt(s) in billing cycle (NPCI OC-98)"
    return True, "upi mandate retry allowed"


def record_attempt(event: dict):
    db.record_network_attempt(
        credential_of(event),
        event.get("card_network") or "unknown",
        event.get("payment_id", ""),
    )
