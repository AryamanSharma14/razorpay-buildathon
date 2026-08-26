from unittest.mock import patch

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def _event(classification="soft", recovered=0, cancelled=0):
    return {
        "payment_id": "pay_force_001",
        "classification": classification,
        "recovered": recovered,
        "merchant_cancelled": cancelled,
        "attempts": 0,
        "amount_paise": 50000,
        "currency": "INR",
        "email": "a@b.com",
        "contact": "+919999999999",
        "error_reason": "insufficient_funds",
        "method": "card",
        "international": 0,
    }


def test_force_now_unknown_payment_returns_error():
    with patch("src.db.get_event", return_value=None):
        assert client.post("/retry/pay_nope/now").json() == {"error": "unknown payment_id"}


def test_force_now_hard_decline_creates_no_link():
    with patch("src.db.get_event", return_value=_event(classification="hard")), \
         patch("src.db.log_audit") as audit, \
         patch("src.recovery.create_payment_link") as link:
        client.post("/retry/pay_force_001/now")
        assert not link.called
        assert "hard_guard" in [c[0][1] for c in audit.call_args_list]


def test_force_now_cancelled_creates_no_link():
    with patch("src.db.get_event", return_value=_event(cancelled=1)), \
         patch("src.db.log_audit"), \
         patch("src.recovery.create_payment_link") as link:
        client.post("/retry/pay_force_001/now")
        assert not link.called


def test_force_now_soft_decline_runs_recovery():
    with patch("src.db.get_event", return_value=_event()), \
         patch("src.db.update_event"), \
         patch("src.db.log_audit"), \
         patch("src.db.count_network_attempts", return_value=0), \
         patch("src.db.last_attempt_ts", return_value=None), \
         patch("src.db.record_network_attempt"), \
         patch("src.recovery.create_payment_link", return_value={"id": "pl1", "short_url": "https://x"}) as link, \
         patch("src.nudge.send", return_value="mock") as nudge, \
         patch("src.scheduler.predict_retry_window", return_value={"delay_hours": 2, "confidence": 0.7, "top_features": []}), \
         patch("src.scheduler.schedule_retry"):
        assert client.post("/retry/pay_force_001/now").json()["fired"] is True
        assert link.called
        assert nudge.called
