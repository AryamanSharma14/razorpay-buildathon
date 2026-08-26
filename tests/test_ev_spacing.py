"""Tests for EV guard (Step 5) and card-testing spacing (Step 6)."""
from unittest.mock import patch, MagicMock
from src.recovery import run_recovery
from src import compliance


# --- EV guard ---

def _ev_event(amount_paise=100, confidence=0.01):
    return {
        "payment_id": "pay_ev1",
        "classification": "soft",
        "recovered": 0,
        "merchant_cancelled": 0,
        "attempts": 0,
        "amount_paise": amount_paise,
        "confidence": confidence,
        "method": "card",
        "card_network": "Visa",
        "error_reason": "payment_failed",
    }


def test_tiny_amount_skipped_as_uneconomic():
    """INR 1 payment with low confidence → EV < 0 → skipped."""
    event = _ev_event(amount_paise=100, confidence=0.01)
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.log_audit") as audit, \
         patch("src.db.update_event"), \
         patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.last_attempt_ts", return_value=None), \
         patch("src.recovery.create_payment_link") as link:
        run_recovery("pay_ev1")
        actions = [c[0][1] for c in audit.call_args_list]
        assert "skipped_uneconomic" in actions
        assert not link.called


def test_large_amount_proceeds():
    """INR 10000 with 60% confidence → EV > 0 → proceeds."""
    event = _ev_event(amount_paise=1_000_000, confidence=0.6)
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.log_audit"), \
         patch("src.db.update_event"), \
         patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.last_attempt_ts", return_value=None), \
         patch("src.db.record_network_attempt"), \
         patch("src.recovery.create_payment_link", return_value={"id": "pl1", "short_url": "https://x"}), \
         patch("src.nudge.send", return_value="mock"), \
         patch("src.scheduler.predict_retry_window", return_value={"delay_hours": 2, "confidence": 0.6, "top_features": []}), \
         patch("src.scheduler.schedule_retry"):
        run_recovery("pay_ev1")


# --- Card-testing spacing ---

def _card_event():
    return {"payment_id": "pay_cs1", "method": "card", "card_network": "Visa",
            "card_iin": "411111", "card_issuer": "HDFC"}


def test_spacing_blocks_recent_attempt():
    from datetime import datetime, timedelta
    recent = (datetime.utcnow() - timedelta(hours=1)).isoformat()
    with patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.last_attempt_ts", return_value=recent):
        allowed, why = compliance.check_retry_allowed(_card_event())
    assert not allowed
    assert "cardtesting_spacing_block" in why


def test_spacing_allows_old_attempt():
    from datetime import datetime, timedelta
    old = (datetime.utcnow() - timedelta(hours=25)).isoformat()
    with patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.last_attempt_ts", return_value=old):
        allowed, _ = compliance.check_retry_allowed(_card_event())
    assert allowed


def test_spacing_allows_no_prior_attempt():
    with patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.last_attempt_ts", return_value=None):
        allowed, _ = compliance.check_retry_allowed(_card_event())
    assert allowed
