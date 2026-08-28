"""Integration tests: simulator scenarios driven through the REAL webhook
pipeline, plus the payment-detail / audit-filter / SSE-wiring endpoints.

Uses a real temp SQLite DB (patched via config.DB_PATH) instead of mocks —
the point is to prove the simulator exercises production code paths.
"""
import pytest
from fastapi.testclient import TestClient

from src import db, events


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr("src.config.DB_PATH", str(tmp_path / "test.db"))
    monkeypatch.setattr("src.recovery.claude_decide", lambda ctx: None)  # keep LLM offline
    db.init_db()
    events.clear()
    from src.main import app
    yield TestClient(app)
    events.clear()


def _audit_actions(pid: str | None = None) -> list[str]:
    return [r["action"] for r in db.get_audit_log(limit=0, payment_id=pid)]


# ── /simulate scenarios ───────────────────────────────────────────────────────

def test_simulate_soft_schedules(client):
    resp = client.post("/simulate", json={"scenario": "soft", "count": 2})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["created"]) == 2
    assert data["events_emitted"] >= 2
    for pid in data["created"]:
        ev = db.get_event(pid)
        assert ev["classification"] == "soft"
        assert ev["retry_at"]


def test_simulate_soft_advance_fires_recovery(client):
    resp = client.post("/simulate", json={"scenario": "soft", "count": 1, "advance_hours": 6})
    pid = resp.json()["created"][0]
    ev = db.get_event(pid)
    assert ev["attempts"] == 1
    assert ev["payment_link_id"]
    assert "recovery_attempt" in _audit_actions(pid)


def test_simulate_hard_never_retries_even_when_advanced(client):
    resp = client.post("/simulate", json={"scenario": "hard", "count": 2, "advance_hours": 24})
    pids = resp.json()["created"]
    for pid in pids:
        ev = db.get_event(pid)
        assert ev["classification"] == "hard"
        assert ev["retry_at"] is None
        assert (ev["attempts"] or 0) == 0
        assert "hard_stop" in _audit_actions(pid)
        assert "hard_guard" in _audit_actions(pid)  # force-fire was blocked


def test_simulate_downtime_queues_then_drains(client):
    resp = client.post("/simulate", json={"scenario": "downtime", "count": 2})
    pids = resp.json()["created"]
    for pid in pids:
        assert db.get_event(pid)["classification"] == "infrastructure"
    assert len(db.all_downtime_queued()) == 2

    # Time-travel: network restores, queue drains, recovery fires
    resp = client.post("/simulate", json={"scenario": "downtime", "count": 1, "advance_hours": 4})
    assert resp.status_code == 200
    assert db.all_downtime_queued() == []
    assert db.all_active_downtimes() == []
    for pid in pids + resp.json()["created"]:
        assert db.get_event(pid)["attempts"] == 1


def test_simulate_card_testing_blocks_same_credential(client):
    resp = client.post("/simulate", json={"scenario": "card_testing", "count": 3})
    pids = resp.json()["created"]
    assert "recovery_attempt" in _audit_actions(pids[0])
    for pid in pids[1:]:
        assert "cardtesting_spacing_block" in _audit_actions(pid)


def test_simulate_trajectory_blocks_escalation(client):
    resp = client.post("/simulate", json={"scenario": "trajectory", "count": 1, "advance_hours": 6})
    pids = resp.json()["created"]
    pid2 = pids[1]
    assert "trajectory_block" in _audit_actions(pid2)
    assert (db.get_event(pid2)["attempts"] or 0) == 0


def test_simulate_ev_negative_skips(client):
    resp = client.post("/simulate", json={"scenario": "ev_negative"})
    pid = resp.json()["created"][0]
    assert "skipped_uneconomic" in _audit_actions(pid)
    assert (db.get_event(pid)["attempts"] or 0) == 0


def test_simulate_payday_schedules(client):
    resp = client.post("/simulate", json={"scenario": "payday", "count": 2})
    pids = resp.json()["created"]
    for pid in pids:
        ev = db.get_event(pid)
        assert ev["classification"] == "soft"
        assert ev["retry_at"]
        assert "scheduled" in _audit_actions(pid)


def test_simulate_unknown_scenario_rejected(client):
    assert client.post("/simulate", json={"scenario": "nope"}).status_code == 400


def test_simulate_reset_wipes_state(client):
    client.post("/simulate", json={"scenario": "soft", "count": 1})
    assert len(db.all_events()) == 1
    resp = client.post("/simulate/reset")
    assert resp.json() == {"reset": True}
    assert db.all_events() == []
    assert db.get_audit_log(limit=0) == []



# ── /dashboard/payment/{id} ───────────────────────────────────────────────────

def test_payment_detail_returns_event_history_audit(client):
    pid = client.post("/simulate", json={"scenario": "soft", "count": 1}).json()["created"][0]
    resp = client.get(f"/dashboard/payment/{pid}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["event"]["payment_id"] == pid
    assert isinstance(data["decline_history"], list)
    assert {r["action"] for r in data["audit"]} >= {"classified", "scheduled"}


def test_payment_detail_unknown_returns_404(client):
    assert client.get("/dashboard/payment/pay_nope").status_code == 404


# ── /dashboard/audit filters ──────────────────────────────────────────────────

def test_audit_filters_by_action_and_payment_id(client):
    pid = client.post("/simulate", json={"scenario": "hard", "count": 1}).json()["created"][0]

    rows = client.get("/dashboard/audit", params={"action": "hard_stop"}).json()["rows"]
    assert rows and all(r["action"] == "hard_stop" for r in rows)

    rows = client.get("/dashboard/audit", params={"payment_id": pid}).json()["rows"]
    assert rows and all(r["payment_id"] == pid for r in rows)

    rows = client.get("/dashboard/audit",
                      params={"action": "hard_stop", "payment_id": pid}).json()["rows"]
    assert len(rows) == 1


# ── SSE wiring ────────────────────────────────────────────────────────────────

def test_events_stream_route_is_wired(client):
    from src.main import app
    assert any(getattr(r, "path", None) == "/events/stream" for r in app.routes)


def test_simulate_pushes_sse_events(client):
    before = events.bus_size()
    client.post("/simulate", json={"scenario": "hard", "count": 1})
    types = [e["type"] for e in events._bus[before:]]
    assert "classified" in types
    assert "hard_stop" in types


def test_simulate_blocked_outside_demo_mode(client, monkeypatch):
    monkeypatch.setattr("src.config.DEMO_MODE", False)
    assert client.post("/simulate", json={"scenario": "soft"}).status_code == 403
    assert client.post("/simulate/reset").status_code == 403
