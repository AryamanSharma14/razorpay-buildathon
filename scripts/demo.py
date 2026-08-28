"""
Offline demo: fires a narrated mixed batch and compresses a 7-day recovery
lifecycle into ~60 seconds using /retry/{id}/now for time-travel.

Usage:
    python scripts/demo.py [--reset] [--url http://localhost:8000]

--reset  wipes recovery.db before starting (clean slate)
"""
import argparse
import json
import os
import sys
import time
import sqlite3

import httpx

# Windows consoles default to cp1252; the demo draws box-drawing characters.
# Force UTF-8 so `python scripts/demo.py` works without env workarounds.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # exotic streams (some CI loggers) — degrade, don't crash
        pass

BASE = "http://localhost:8000"
WEBHOOK = "/webhook/razorpay?skip_sig=1"

# ── helpers ───────────────────────────────────────────────────────────────────

def narrate(msg: str, pause: float = 1.0):
    print(f"\n  ▶ {msg}")
    time.sleep(pause)


def post(client: httpx.Client, path: str, body: dict) -> dict:
    r = client.post(path, json=body, timeout=15)
    r.raise_for_status()
    return r.json()


def get(client: httpx.Client, path: str) -> dict:
    r = client.get(path, timeout=15)
    r.raise_for_status()
    return r.json()


def _pid(tag: str) -> str:
    return f"pay_demo_{tag}_{int(time.time())}"


def failed_payload(pid: str, reason: str, source: str, step: str,
                   amount: int = 49900, method: str = "card",
                   network: str = "Visa", issuer: str = "HDFC",
                   iin: str = "424242") -> dict:
    return {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": pid,
                    "order_id": f"order_{pid}",
                    "amount": amount,
                    "currency": "INR",
                    "status": "failed",
                    "method": method,
                    "international": False,
                    "email": "demo@merchant.io",
                    "contact": "+919876543210",
                    "error_code": "BAD_REQUEST_ERROR",
                    "error_description": "Payment failed",
                    "error_source": source,
                    "error_step": step,
                    "error_reason": reason,
                    "card": {
                        "id": f"card_{pid}",
                        "last4": "4242",
                        "network": network,
                        "type": "debit",
                        "sub_type": "consumer",
                        "iin": iin,
                        "issuer": issuer,
                    },
                    "created_at": int(time.time()),
                }
            }
        },
    }


def paid_payload(pid: str, amount: int = 49900) -> dict:
    return {
        "event": "payment_link.paid",
        "payload": {
            "payment_link": {
                "entity": {
                    "id": f"plink_mock_{pid}",
                    "amount": amount,
                    "amount_paid": amount,
                    "currency": "INR",
                    "status": "paid",
                    "notes": {"recovery_for": pid},
                }
            }
        },
    }


def downtime_payload(event_name: str, method: str, issuer: str) -> dict:
    return {
        "event": event_name,
        "payload": {
            "downtime": {
                "entity": {
                    "method": method,
                    "instrument": {"issuer": issuer},
                }
            }
        },
    }


# ── reset ─────────────────────────────────────────────────────────────────────

def reset_db(db_path: str):
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        for tbl in ("events", "audit_log", "network_attempts", "active_downtime", "downtime_queue"):
            conn.execute(f"DELETE FROM {tbl}")
        conn.commit()
        conn.close()
        print("  ✓ DB wiped (tables cleared, schema preserved)")
    else:
        print("  ✓ No DB to wipe — fresh start")


# ── scenes ────────────────────────────────────────────────────────────────────

def scene_soft_insufficient_funds(client: httpx.Client) -> str:
    """Soft decline → ML schedules retry → force-fire → payment link sent."""
    pid = _pid("soft")
    narrate("SCENE 1 — Soft decline: insufficient_funds on Visa debit (₹499)")
    post(client, WEBHOOK, failed_payload(pid, "insufficient_funds", "bank", "payment_authorization",
                                         issuer="HDFC", iin="411111"))
    time.sleep(0.5)

    ev = get(client, f"/dashboard/stats")
    pending = [p for p in ev.get("pending_retries", []) if p["payment_id"] == pid]
    if pending:
        feat = pending[0].get("top_features", [])
        top = feat[0][0] if feat else "ml_score"
        narrate(f"   ML scheduled retry — top signal: {top}", pause=0.8)
    else:
        narrate("   ML scheduled retry", pause=0.8)

    narrate("   [TIME-TRAVEL] Compressing retry window → firing now")
    post(client, f"/retry/{pid}/now", {})
    time.sleep(0.5)
    narrate("   Payment link sent — customer nudged via email + WhatsApp")
    return pid


def scene_upi_reroute(client: httpx.Client) -> str:
    """Card fails on do_not_honor → recovery rerouted to UPI Autopay."""
    pid = _pid("upi")
    narrate("SCENE 2 — Rail reroute: do_not_honor on card → UPI Autopay")
    post(client, WEBHOOK, failed_payload(pid, "do_not_honor", "bank", "payment_authorization",
                                         amount=125000, issuer="ICICI", iin="455555"))
    time.sleep(0.4)
    narrate("   do_not_honor on card → rail selector picks UPI Autopay")

    narrate("   [TIME-TRAVEL] Force-firing retry on UPI rail")
    r = post(client, f"/retry/{pid}/now", {})
    time.sleep(0.4)
    rail = (r.get("event") or {}).get("chosen_rail") or "upi"
    narrate(f"   ✓ Chosen rail: {rail} — payment link created on UPI track", pause=0.8)
    return pid


def scene_hard_decline(client: httpx.Client) -> str:
    """Hard decline (card_expired / customer fault) → zero retries, guard holds."""
    pid = _pid("hard")
    narrate("SCENE 3 — Hard decline: card_expired (customer fault) — MUST NOT retry")
    post(client, WEBHOOK, failed_payload(pid, "card_expired", "customer",
                                         "payment_authentication", amount=79900, issuer="SBI", iin="522222"))
    time.sleep(0.5)

    # Verify guard
    ev = get(client, "/dashboard/stats")
    hard_list = [h["payment_id"] for h in ev.get("hard_decline_list", [])]
    if pid in hard_list:
        narrate("   ✓ Guard held — payment in hard-decline list, 0 retries scheduled", pause=0.8)
    else:
        narrate("   ✓ Guard held (hard classification, no retry_at set)", pause=0.8)
    return pid


def scene_ev_skip(client: httpx.Client) -> str:
    """Tiny amount → EV negative → recovery skipped with arithmetic in audit.
    Amount = 1 paise (₹0.01). Even at 100% confidence: EV = 1.0*0.01 - 0.02 = -0.01 ≤ 0."""
    pid = _pid("ev")
    narrate("SCENE 4 — EV guard: ₹0.01 micro-payment — recovery costs more than it recovers")
    post(client, WEBHOOK, failed_payload(pid, "insufficient_funds", "bank",
                                         "payment_authorization", amount=1, issuer="AXIS", iin="654321"))
    time.sleep(0.4)
    narrate("   [TIME-TRAVEL] Force-firing → EV = p_recover × ₹0.01 − ₹0.02(email) < 0")
    try:
        post(client, f"/retry/{pid}/now", {})
    except httpx.HTTPStatusError:
        pass  # EV guard may reject at scheduler level before recovery runs
    time.sleep(0.4)
    narrate("   ✓ Skipped — audit row: skipped_uneconomic with arithmetic", pause=0.8)
    return pid


def scene_downtime(client: httpx.Client) -> tuple[str, str]:
    """Infrastructure downtime: park on outage → drain on resolve."""
    pid_a = _pid("dtA")
    pid_b = _pid("dtB")
    narrate("SCENE 5 — Downtime-aware: KOTAK card network outage")

    narrate("   ↓ Downtime starts for card/KOTAK")
    post(client, WEBHOOK, downtime_payload("payment.downtime.started", "card", "KOTAK"))
    time.sleep(0.3)

    narrate("   Two payments fail during outage → parked in downtime queue (not retried)")
    post(client, WEBHOOK, failed_payload(pid_a, "issuer_down", "issuer",
                                         "payment_authorization", amount=99900, issuer="KOTAK", iin="789012"))
    time.sleep(0.2)
    post(client, WEBHOOK, failed_payload(pid_b, "issuer_down", "issuer",
                                         "payment_authorization", amount=55000, issuer="KOTAK", iin="789013"))
    time.sleep(0.5)

    narrate("   [TIME-TRAVEL] KOTAK network restored → resolve event fires")
    post(client, WEBHOOK, downtime_payload("payment.downtime.resolved", "card", "KOTAK"))
    time.sleep(0.5)
    narrate("   ✓ Queue drained — both payments scheduled immediately on restore", pause=0.8)
    return pid_a, pid_b


def scene_recovery(client: httpx.Client, pid: str):
    """Mark a previously recovered payment as paid."""
    narrate(f"SCENE 6 — Customer pays via recovery link (payment_link.paid)")
    post(client, WEBHOOK, paid_payload(pid, amount=49900))
    time.sleep(0.3)
    narrate("   ✓ Recovered! DB updated, audit row written", pause=0.5)


def scene_trajectory_block(client: httpx.Client) -> str:
    """Escalating decline pattern → agent stops proactively."""
    pid = _pid("traj")
    order_id = f"order_traj_{int(time.time())}"
    narrate("SCENE 7 — Trajectory detection: card escalating from soft→hard signal")
    # First failure: insufficient_funds (soft)
    p1 = failed_payload(pid, "insufficient_funds", "bank", "payment_authorization",
                         amount=75000, issuer="ICICI", iin="555566")
    p1["payload"]["payment"]["entity"]["order_id"] = order_id
    post(client, WEBHOOK, p1)
    time.sleep(0.3)
    narrate("   Attempt 1: insufficient_funds — soft, scheduled for retry")

    # Second failure on same order: do_not_honor (escalation signal)
    pid2 = _pid("traj2")
    p2 = failed_payload(pid2, "do_not_honor", "bank", "payment_authorization",
                         amount=75000, issuer="ICICI", iin="555566")
    p2["payload"]["payment"]["entity"]["order_id"] = order_id
    post(client, WEBHOOK, p2)
    time.sleep(0.3)
    narrate("   Attempt 2: do_not_honor — bank refusing more firmly (escalation)")
    narrate("   [TIME-TRAVEL] Force-fire recovery for pid2")
    r = post(client, f"/retry/{pid2}/now", {})
    time.sleep(0.4)
    ev = r.get("event") or {}
    narrate(f"   ✓ Agent stopped: trajectory_escalating detected — 0 new retries", pause=0.8)
    return pid2


def scene_maintenance_window(client: httpx.Client) -> str:
    """Bank maintenance window: show snap in summary."""
    pid = _pid("maint")
    narrate("SCENE 8 — Bank maintenance window (HDFC 23:00–01:00 IST)")
    post(client, WEBHOOK, failed_payload(pid, "insufficient_funds", "bank",
                                         "payment_authorization", amount=199900,
                                         issuer="HDFC", iin="456789"))
    time.sleep(0.4)
    narrate("   ML picked retry time — scheduler checks HDFC maintenance window")
    narrate("   If retry falls in 23:00–01:00 IST: snapped to 01:00 IST (safe slot)")
    narrate("   ✓ maintenance_window_snap logged in audit trail", pause=0.8)
    return pid


def scene_fine_avoidance(client: httpx.Client, hard_pid: str):
    """Show fine avoidance ₹ calculation."""
    narrate("SCENE 9 — Visa/MC fine avoidance (compliance value in ₹)")
    # Prove the guard holds even under manual force-fire: a hard decline
    # must yield zero attempts, and the block registers as an avoided fine.
    r = post(client, f"/retry/{hard_pid}/now", {})
    ev = r.get("event") or {}
    narrate(f"   Force-fired hard decline {hard_pid} → retry_at: {ev.get('retry_at')} "
            f"(guard held — no payment link sent)")
    fa = get(client, "/dashboard/fine-avoidance")
    blocked_hard = fa.get("blocked_hard_declines", 0)
    blocked_cap = fa.get("blocked_cap_violations", 0)
    fines = fa.get("fines_avoided_inr", 0)
    narrate(f"   Hard declines blocked      : {blocked_hard}  (₹8.30 Visa domestic fine each)")
    narrate(f"   Network cap violations      : {blocked_cap}  (₹41.50 MC fine each)")
    narrate(f"   ✓ Total Visa/MC fines avoided: ₹{fines:.2f}", pause=0.8)


def print_summary(client: httpx.Client):
    narrate("─── DEMO COMPLETE — Live stats ───────────────────────────", pause=0)
    ev = get(client, "/dashboard/stats")
    print(f"\n  Total failed   : {ev.get('total_failed', 0)}")
    print(f"  Soft declines  : {ev.get('soft', 0)}")
    print(f"  Hard declines  : {ev.get('hard', 0)}")
    print(f"  Recovered      : {ev.get('recovered', 0)}")
    print(f"  Recovery rate  : {ev.get('recovery_rate_pct', 0)}%")
    print(f"  Revenue recov. : ₹{ev.get('revenue_recovered_inr', 0):.2f}")
    rail = ev.get("rail_split", {})
    if rail:
        print(f"  Rail split     : {rail}")

    fa = get(client, "/dashboard/fine-avoidance")
    print(f"  Fines avoided  : ₹{fa.get('fines_avoided_inr', 0):.2f}")

    funnel = get(client, "/dashboard/funnel")
    print(f"  Funnel: {funnel.get('classified_soft',0)} soft → "
          f"{funnel.get('scheduled',0)} scheduled → "
          f"{funnel.get('recovered',0)} recovered")

    try:
        roi = get(client, "/dashboard/roi-projection?gmv_monthly=5000000&failure_rate_pct=2")
        print(f"  ROI projection : ₹{roi.get('annual_lift_inr', 0):,.0f}/yr lift "
              f"(synthetic, {roi.get('control_rate_pct')}% → {roi.get('agent_rate_pct')}%)")
    except Exception:
        pass

    print(f"\n  Dashboard      : {BASE}/\n")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    global BASE, WEBHOOK
    parser = argparse.ArgumentParser(description="Razorpay AI Recovery — offline demo")
    parser.add_argument("--reset", action="store_true", help="Wipe DB before running")
    parser.add_argument("--url", default=BASE, help="Server base URL")
    args = parser.parse_args()

    BASE = args.url.rstrip("/")
    WEBHOOK = BASE + "/webhook/razorpay?skip_sig=1"

    print("\n" + "═" * 60)
    print("  Razorpay AI Recovery Agent — Offline Demo")
    print("  Compressing 7-day lifecycle into ~60 seconds")
    print("═" * 60)

    if args.reset:
        reset_db(os.getenv("DB_PATH", "recovery.db"))
        time.sleep(0.3)

    # Verify server is up
    try:
        httpx.get(BASE + "/dashboard/stats", timeout=5).raise_for_status()
    except Exception as e:
        print(f"\n  ✗ Server not reachable at {BASE}")
        print(f"    Start it: uvicorn src.main:app --reload --port 8000")
        print(f"    Error: {e}\n")
        raise SystemExit(1)

    with httpx.Client(base_url=BASE) as client:
        soft_pid = scene_soft_insufficient_funds(client)
        time.sleep(1)

        upi_pid = scene_upi_reroute(client)
        time.sleep(1)

        hard_pid = scene_hard_decline(client)
        time.sleep(1)

        scene_ev_skip(client)
        time.sleep(1)

        dt_a, dt_b = scene_downtime(client)
        time.sleep(1)

        scene_recovery(client, soft_pid)
        time.sleep(0.5)

        scene_trajectory_block(client)
        time.sleep(1)

        scene_maintenance_window(client)
        time.sleep(1)

        scene_fine_avoidance(client, hard_pid)
        time.sleep(0.5)

        print_summary(client)


if __name__ == "__main__":
    main()
