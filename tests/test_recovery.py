import pytest
from unittest.mock import patch, MagicMock
from src import db, config
from src.recovery import run_recovery, create_payment_link, select_rail
from src.classifier import classify_trajectory


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
         patch("src.db.last_attempt_ts", return_value=None), \
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


def test_trajectory_escalating_blocks_retry():
    history = [
        {"error_reason": "insufficient_funds", "created_at": "2026-08-26 10:00:00"},
        {"error_reason": "do_not_honor", "created_at": "2026-08-26 12:00:00"},
    ]
    event = _make_event()
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.log_audit") as audit, \
         patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.last_attempt_ts", return_value=None), \
         patch("src.db.get_decline_history", return_value=history), \
         patch("src.recovery.create_payment_link") as link:
        run_recovery("pay_test_001")
    assert not link.called
    actions = [c[0][1] for c in audit.call_args_list]
    assert "trajectory_block" in actions


def test_trajectory_timeout_then_insufficient_funds_allows_retry():
    history = [
        {"error_reason": "payment_timeout", "created_at": "2026-08-26 10:00:00"},
        {"error_reason": "insufficient_funds", "created_at": "2026-08-26 12:00:00"},
    ]
    assert classify_trajectory(history) == "ok"


def test_trajectory_stuck_three_same():
    history = [{"error_reason": "insufficient_funds"}] * 3
    assert classify_trajectory(history) == "trajectory_stuck"


def test_trajectory_ok_single_entry():
    assert classify_trajectory([{"error_reason": "insufficient_funds"}]) == "ok"


def test_claude_abandon_blocks_retry():
    event = _make_event()
    claude_response = {"action": "abandon", "rail": None, "reasoning": "escalating pattern", "confidence": 0.9}
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.log_audit") as audit, \
         patch("src.db.update_event"), \
         patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.last_attempt_ts", return_value=None), \
         patch("src.db.get_decline_history", return_value=[]), \
         patch("src.recovery.claude_decide", return_value=claude_response), \
         patch("src.recovery.create_payment_link") as link:
        run_recovery("pay_test_001")
    assert not link.called
    actions = [c[0][1] for c in audit.call_args_list]
    assert "claude_abandon" in actions


def test_claude_reroute_overrides_rail():
    event = _make_event(method="card", error_reason="payment_failed")
    claude_response = {"action": "reroute", "rail": "upi", "reasoning": "card issuer degraded", "confidence": 0.8}
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.log_audit") as audit, \
         patch("src.db.update_event"), \
         patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.last_attempt_ts", return_value=None), \
         patch("src.db.get_decline_history", return_value=[]), \
         patch("src.db.record_network_attempt"), \
         patch("src.recovery.claude_decide", return_value=claude_response), \
         patch("src.recovery.create_payment_link", return_value={"id": "pl1", "short_url": "https://x"}), \
         patch("src.nudge.send", return_value="mock"), \
         patch("src.scheduler.predict_retry_window", return_value={"delay_hours": 2, "confidence": 0.7, "top_features": []}), \
         patch("src.scheduler.schedule_retry"):
        run_recovery("pay_test_001")
    actions = [c[0][1] for c in audit.call_args_list]
    assert "claude_reroute" in actions


def test_claude_api_down_falls_back_to_ml():
    event = _make_event()
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.log_audit"), \
         patch("src.db.update_event"), \
         patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.last_attempt_ts", return_value=None), \
         patch("src.db.get_decline_history", return_value=[]), \
         patch("src.db.record_network_attempt"), \
         patch("src.recovery.claude_decide", return_value=None), \
         patch("src.recovery.create_payment_link", return_value={"id": "pl1", "short_url": "https://x"}) as link, \
         patch("src.nudge.send", return_value="mock"), \
         patch("src.scheduler.predict_retry_window", return_value={"delay_hours": 2, "confidence": 0.7, "top_features": []}), \
         patch("src.scheduler.schedule_retry"):
        run_recovery("pay_test_001")
    assert link.called  # fallback: ML path fires normally


def test_cancel_sets_flag():
    event = _make_event()
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.update_event") as mock_update, \
         patch("src.db.log_audit"), \
         patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.last_attempt_ts", return_value=None), \
         patch("src.db.record_network_attempt"), \
         patch("src.recovery.create_payment_link", return_value={"id": "pl1", "short_url": "https://x"}), \
         patch("src.nudge.send", return_value="mock"), \
         patch("src.scheduler.predict_retry_window", return_value={"delay_hours": 2, "confidence": 0.7, "top_features": []}), \
         patch("src.scheduler.schedule_retry"):
        run_recovery("pay_test_001")
        update_calls = [c[1] for c in mock_update.call_args_list]
        assert any("attempts" in kw for kw in update_calls)
