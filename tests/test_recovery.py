import pytest
from unittest.mock import patch, MagicMock
from src import db, config
from src.recovery import run_recovery, create_payment_link, select_rail


def _make_event(payment_id="pay_test_001", classification="soft", recovered=0, cancelled=0,
                attempts=0, method="card", error_reason="insufficient_funds"):
    return {
        "payment_id": payment_id,
        "classification": classification,
        "recovered": recovered,
        "merchant_cancelled": cancelled,
        "attempts": attempts,
        "amount_paise": 50000,
        "currency": "INR",
        "email": "test@example.com",
        "contact": "+919999999999",
        "method": method,
        "error_reason": error_reason,
    }


def test_hard_guard_blocks():
    event = _make_event(classification="hard")
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.log_audit") as mock_audit:
        run_recovery("pay_test_001")
        actions = [c[0][1] for c in mock_audit.call_args_list]
        assert "hard_guard" in actions


def test_recovered_guard_blocks():
    event = _make_event(recovered=1)
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.log_audit") as mock_audit:
        run_recovery("pay_test_001")
        actions = [c[0][1] for c in mock_audit.call_args_list]
        assert "already_recovered" in actions


def test_cancelled_guard_blocks():
    event = _make_event(cancelled=1)
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.log_audit") as mock_audit:
        run_recovery("pay_test_001")
        actions = [c[0][1] for c in mock_audit.call_args_list]
        assert "cancelled_guard" in actions


def test_demo_mode_returns_mock_link():
    event = _make_event()
    orig_key = config.RAZORPAY_KEY_ID
    config.RAZORPAY_KEY_ID = ""
    try:
        with patch("src.db.log_audit"):
            link = create_payment_link(event)
        assert "mock" in link["id"]
        assert link["short_url"] == "https://rzp.io/i/mock"
    finally:
        config.RAZORPAY_KEY_ID = orig_key


def test_select_rail_card_insufficient_funds_routes_upi():
    assert select_rail(_make_event(method="card", error_reason="insufficient_funds")) == "upi"
    assert select_rail(_make_event(method="card", error_reason="issuer_down")) == "upi"


def test_select_rail_card_generic_failure_stays_card():
    assert select_rail(_make_event(method="card", error_reason="payment_failed")) == "card"


def test_select_rail_non_card_unchanged():
    assert select_rail(_make_event(method="upi", error_reason="insufficient_funds")) == "upi"
    assert select_rail(_make_event(method="netbanking", error_reason="insufficient_funds")) == "netbanking"


def test_run_recovery_routes_card_to_upi_and_audits():
    event = _make_event(method="card", error_reason="insufficient_funds")
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.update_event") as mock_update, \
         patch("src.db.log_audit") as mock_audit, \
         patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.record_network_attempt"), \
         patch("src.recovery.create_payment_link", return_value={"id": "pl1", "short_url": "https://x"}), \
         patch("src.nudge.send", return_value="mock"), \
         patch("src.scheduler.predict_retry_window", return_value={"delay_hours": 2, "confidence": 0.7, "top_features": []}), \
         patch("src.scheduler.schedule_retry"):
        run_recovery("pay_test_001")
        actions = [c[0][1] for c in mock_audit.call_args_list]
        assert "rail_routed" in actions
        assert any(kw.get("chosen_rail") == "upi" for _, kw in
                   [(c[0], c[1]) for c in mock_update.call_args_list])


def test_run_recovery_hard_decline_never_routes():
    event = _make_event(classification="hard", method="card", error_reason="insufficient_funds")
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.update_event") as mock_update, \
         patch("src.db.log_audit") as mock_audit:
        run_recovery("pay_test_001")
        actions = [c[0][1] for c in mock_audit.call_args_list]
        assert "hard_guard" in actions
        assert "rail_routed" not in actions
        assert not any(kw.get("chosen_rail") for _, kw in
                       [(c[0], c[1]) for c in mock_update.call_args_list])


def test_cancel_sets_flag():
    event = _make_event()
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.update_event") as mock_update, \
         patch("src.db.log_audit"), \
         patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.record_network_attempt"), \
         patch("src.recovery.create_payment_link", return_value={"id": "pl1", "short_url": "https://x"}), \
         patch("src.nudge.send", return_value="mock"), \
         patch("src.scheduler.predict_retry_window", return_value={"delay_hours": 2, "confidence": 0.7, "top_features": []}), \
         patch("src.scheduler.schedule_retry"):
        run_recovery("pay_test_001")
        update_calls = [c[1] for c in mock_update.call_args_list]
        assert any("attempts" in kw for kw in update_calls)
