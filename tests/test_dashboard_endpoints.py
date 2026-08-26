"""Tests for new dashboard endpoints (Steps 7+8)."""
from fastapi.testclient import TestClient
from unittest.mock import patch


def _client():
    from src.main import app
    return TestClient(app)


def test_stats_includes_funnel_and_rail_split():
    with patch("src.db.all_events", return_value=[
        {"payment_id": "p1", "classification": "soft", "recovered": 1,
         "merchant_cancelled": 0, "retry_at": None, "amount_paise": 50000,
         "error_reason": "insufficient_funds", "attempts": 1,
         "nudge_channel": "email", "method": "card", "chosen_rail": "upi",
         "top_features": None, "classify_reason": None,
         "confidence": 0.7, "nudge_reasoning": None, "payment_link_url": None},
    ]):
        resp = _client().get("/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "decline_funnel" in data
    assert "rail_split" in data
    assert "hard_decline_list" in data


def test_audit_endpoint_returns_rows():
    with patch("src.db.get_audit_log", return_value=[
        {"id": 1, "payment_id": "p1", "action": "scheduled", "detail": "", "ts": "2026-08-25"}
    ]):
        resp = _client().get("/dashboard/audit")
    assert resp.status_code == 200
    data = resp.json()
    assert "rows" in data
    assert data["rows"][0]["action"] == "scheduled"


def test_downtime_board_endpoint():
    with patch("src.db.all_active_downtimes", return_value=[]), \
         patch("src.db.all_downtime_queued", return_value=[]):
        resp = _client().get("/dashboard/downtime")
    assert resp.status_code == 200
    data = resp.json()
    assert "active_downtimes" in data
    assert "queued_payments" in data


def test_insights_endpoint_offline():
    with patch("src.db.all_events", return_value=[]), \
         patch("src.config.ANTHROPIC_API_KEY", ""):
        resp = _client().get("/dashboard/insights")
    assert resp.status_code == 200
    data = resp.json()
    assert "insights" in data
    assert "generated_by" in data


def test_model_health_no_model():
    import src.scheduler as sc
    orig = sc._model_bundle
    sc._model_bundle = None
    try:
        with patch("src.db.all_events", return_value=[]):
            resp = _client().get("/dashboard/model-health")
        assert resp.status_code == 200
        assert resp.json()["model_loaded"] is False
    finally:
        sc._model_bundle = orig


def test_cost_analysis_empty_db_no_divide_by_zero():
    with patch("src.db.all_events", return_value=[]):
        resp = _client().get("/dashboard/cost-analysis")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_nudge_spend_inr"] == 0.0
    assert data["net_roi_inr"] == 0.0
    assert data["roi_multiple"] is None


def test_cost_analysis_known_event():
    events = [
        {"recovered": 1, "nudge_channel": "email", "amount_paise": 50000, "confidence": 0.7},
        {"recovered": 0, "nudge_channel": "whatsapp", "amount_paise": 0, "confidence": 0.5},
    ]
    with patch("src.db.all_events", return_value=events):
        resp = _client().get("/dashboard/cost-analysis")
    data = resp.json()
    # email=0.02, whatsapp=0.35 → spend=0.37, recovered=₹500
    assert abs(data["total_nudge_spend_inr"] - 0.37) < 0.01
    assert data["revenue_recovered_inr"] == 500.0


def test_stats_date_range_filter():
    events = [
        {"payment_id": "p1", "classification": "soft", "recovered": 0, "merchant_cancelled": 0,
         "retry_at": None, "amount_paise": 50000, "error_reason": "insufficient_funds",
         "attempts": 0, "nudge_channel": None, "method": "card", "chosen_rail": None,
         "top_features": None, "classify_reason": None, "confidence": 0.7,
         "nudge_reasoning": None, "payment_link_url": None, "created_at": "2026-08-10 10:00:00"},
        {"payment_id": "p2", "classification": "soft", "recovered": 0, "merchant_cancelled": 0,
         "retry_at": None, "amount_paise": 50000, "error_reason": "insufficient_funds",
         "attempts": 0, "nudge_channel": None, "method": "card", "chosen_rail": None,
         "top_features": None, "classify_reason": None, "confidence": 0.7,
         "nudge_reasoning": None, "payment_link_url": None, "created_at": "2026-08-20 10:00:00"},
    ]
    with patch("src.db.all_events", return_value=events):
        resp = _client().get("/dashboard/stats?from_date=2026-08-15")
    assert resp.status_code == 200
    assert resp.json()["total_failed"] == 1  # only p2 passes date filter


def test_funnel_endpoint_consistency():
    events = [
        {"classification": "soft", "recovered": 1, "merchant_cancelled": 0, "nudge_channel": "email",
         "retry_at": "2026-08-26T10:00:00", "amount_paise": 50000},
        {"classification": "hard", "recovered": 0, "merchant_cancelled": 0, "nudge_channel": None,
         "retry_at": None, "amount_paise": 50000},
    ]
    audit = [
        {"action": "network_cap_block", "payment_id": "p1", "detail": ""},
        {"action": "scheduled", "payment_id": "p1", "detail": ""},
        {"action": "recovery_attempt", "payment_id": "p1", "detail": ""},
    ]
    with patch("src.db.all_events", return_value=events), \
         patch("src.db.get_audit_log", return_value=audit):
        resp = _client().get("/dashboard/funnel")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_failed"] == 2
    assert data["classified_soft"] == 1
    assert data["classified_hard"] == 1
    assert data["recovered"] <= data["classified_soft"]


def test_roi_projection_zero_gmv_returns_zeros():
    resp = _client().get("/dashboard/roi-projection?gmv_monthly=0&failure_rate_pct=2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["failed_monthly_inr"] == 0.0
    assert data["monthly_lift_inr"] == 0.0
    assert data["annual_lift_inr"] == 0.0


def test_roi_projection_arithmetic():
    resp = _client().get("/dashboard/roi-projection?gmv_monthly=1000000&failure_rate_pct=2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["failed_monthly_inr"] == 20000.0
    assert data["with_agent_inr"] > data["currently_recovered_inr"]
    assert data["annual_lift_inr"] == round(data["monthly_lift_inr"] * 12, 2)


def test_fine_avoidance_calculates_correctly():
    audit_rows = [
        {"action": "hard_guard", "payment_id": "pay_a", "detail": ""},
        {"action": "hard_guard", "payment_id": "pay_b", "detail": ""},
        {"action": "network_cap_block", "payment_id": "pay_c", "detail": "mastercard cap reached"},
        {"action": "cardtesting_spacing_block", "payment_id": "pay_d", "detail": ""},
    ]
    events = {
        "pay_a": {"international": 0},
        "pay_b": {"international": 1},
    }
    with patch("src.db.get_audit_log", return_value=audit_rows), \
         patch("src.db.get_event", side_effect=lambda pid: events.get(pid)):
        resp = _client().get("/dashboard/fine-avoidance")
    assert resp.status_code == 200
    data = resp.json()
    assert data["blocked_hard_declines"] == 2
    assert data["blocked_cap_violations"] == 1
    assert data["blocked_card_testing"] == 1
    # pay_a domestic ₹8.30, pay_b cross-border ₹20.75, pay_c MC ₹41.50 = ₹70.55
    assert abs(data["fines_avoided_inr"] - 70.55) < 0.01
