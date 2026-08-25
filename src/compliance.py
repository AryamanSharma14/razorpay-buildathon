"""Card-network retry caps. Counted per credential, per rolling window.

Visa: 20 attempts per rolling 30 days (raised from 15 on 2025-05-19).
Mastercard: 10 per 24h and 35 per 30 days, enforced via Transaction Processing Excellence.
Unknown networks fall back to the strictest published limits.
See docs/research-brief.md.
"""
from src import db

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

    return True, f"within {network or 'unknown'} caps"


def record_attempt(event: dict):
    db.record_network_attempt(
        credential_of(event),
        event.get("card_network") or "unknown",
        event.get("payment_id", ""),
    )
