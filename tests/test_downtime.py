"""Tests for downtime-aware recovery (Step 4)."""
from unittest.mock import patch, MagicMock
from src.classifier import classify


def test_infrastructure_classify_when_downtime_active():
    fake_downtime = {"id": 1, "method": "card", "issuer": "HDFC", "status": "active"}
    with patch("src.db.active_downtime_for", return_value=fake_downtime):
        result = classify("bank", "authorization", "issuer_down", method="card", issuer="HDFC")
    assert result["type"] == "infrastructure"
    assert result["action"] == "queue_for_downtime"


def test_soft_classify_when_no_downtime():
    with patch("src.db.active_downtime_for", return_value=None):
        result = classify("bank", "authorization", "issuer_down", method="card", issuer="HDFC")
    assert result["type"] == "soft"


def test_hard_classify_never_infrastructure():
    # Hard reasons must never be rerouted via infrastructure path
    with patch("src.db.active_downtime_for", return_value={"id": 1}):
        result = classify("customer", "auth", "card_expired", method="card", issuer="HDFC")
    assert result["type"] == "hard"


def test_downtime_queues_payment_on_webhook():
    from src.webhook import _handle_payment_failed
    fake_downtime = {"id": 42, "method": "card", "issuer": "HDFC", "status": "active"}
    payload = {"payload": {"payment": {"entity": {
        "id": "pay_dt1", "amount": 50000, "currency": "INR",
        "method": "card", "error_source": "bank",
        "error_step": "authorization", "error_reason": "issuer_down",
        "card": {"network": "Visa", "type": "credit", "issuer": "HDFC", "iin": "411111"},
    }}}}
    with patch("src.db.get_event", return_value=None), \
         patch("src.db.insert_event"), \
         patch("src.db.update_event"), \
         patch("src.db.log_audit") as audit, \
         patch("src.db.active_downtime_for", return_value=fake_downtime), \
         patch("src.db.queue_for_downtime") as queue, \
         patch("src.compliance.check_retry_allowed", return_value=(True, "ok")), \
         patch("src.compliance.credential_of", return_value="iin:HDFC"):
        _handle_payment_failed(payload)
    queue.assert_called_once_with("pay_dt1", 42)
    actions = [c[0][1] for c in audit.call_args_list]
    assert "downtime_queued" in actions


def test_downtime_resolve_drains_queue():
    from src.webhook import _handle_downtime_resolved
    payload = {"payload": {"downtime": {"entity": {
        "method": "card",
        "instrument": {"issuer": "HDFC"},
    }}}}
    with patch("src.db.resolve_downtime"), \
         patch("src.db.log_audit"), \
         patch("src.db.drain_downtime_queue", return_value=["pay_dt1", "pay_dt2"]) as drain, \
         patch("src.recovery.run_recovery") as run_rec:
        _handle_downtime_resolved(payload)
    drain.assert_called_once_with("card", "HDFC")
    assert run_rec.call_count == 2


def test_paid_webhook_replay_does_not_double_count():
    from src.webhook import _handle_link_paid
    payload = {"payload": {"payment_link": {"entity": {
        "notes": {"recovery_for": "pay_already_done"},
    }}}}
    with patch("src.db.get_event", return_value={"payment_id": "pay_already_done", "recovered": 1}), \
         patch("src.db.log_audit") as audit, \
         patch("src.db.update_event") as update:
        _handle_link_paid(payload)
    update.assert_not_called()
    actions = [c[0][1] for c in audit.call_args_list]
    assert "duplicate_paid" in actions


def test_malformed_json_webhook_returns_400():
    from fastapi.testclient import TestClient
    from src.main import app
    client = TestClient(app)
    with patch("src.db.log_audit"):
        resp = client.post(
            "/webhook/razorpay?skip_sig=1",
            content=b"not valid json",
            headers={"Content-Type": "application/json"},
        )
    assert resp.status_code == 400
