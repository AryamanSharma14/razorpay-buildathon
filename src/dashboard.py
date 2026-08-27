"""Dashboard API routes + stats."""
import json
import os
import time
from pathlib import Path

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse

from src import config, db
from src import scheduler as sched

_insights_cache: dict = {}
_INSIGHTS_TTL = 300  # seconds

router = APIRouter()

_DIST = Path(__file__).parent / "web" / "dist"
_INDEX = _DIST / "index.html"


@router.get("/")
def serve_dashboard():
    return FileResponse(str(_INDEX))


@router.get("/dashboard/stats")
def stats(from_date: str = Query(None), to_date: str = Query(None)):
    events = db.all_events()
    if from_date:
        events = [e for e in events if (e.get("created_at") or "") >= from_date]
    if to_date:
        events = [e for e in events if (e.get("created_at") or "") <= to_date]

    total = len(events)
    soft = [e for e in events if e.get("classification") == "soft"]
    hard = [e for e in events if e.get("classification") == "hard"]
    recovered = [e for e in events if e.get("recovered")]
    cancelled = [e for e in events if e.get("merchant_cancelled")]

    pending = [
        e for e in soft
        if not e.get("recovered") and not e.get("merchant_cancelled") and e.get("retry_at")
    ]

    recovery_rate = round(len(recovered) / len(soft) * 100, 1) if soft else 0.0
    revenue_recovered_inr = sum(e.get("amount_paise", 0) for e in recovered) / 100

    channels = {}
    for e in events:
        ch = e.get("nudge_channel")
        if ch:
            channels[ch] = channels.get(ch, 0) + 1

    pending_rows = []
    for e in pending:
        top_f = e.get("top_features")
        try:
            top_f = json.loads(top_f) if top_f else []
        except Exception:
            top_f = []
        pending_rows.append({
            "payment_id": e["payment_id"],
            "amount_inr": e["amount_paise"] / 100,
            "retry_at": e.get("retry_at"),
            "classify_reason": e.get("classify_reason"),
            "chosen_rail": e.get("chosen_rail"),
            "confidence": e.get("confidence"),
            "top_features": top_f,
            "nudge_reasoning": e.get("nudge_reasoning"),
            "nudge_message": e.get("nudge_message"),
            "payment_link_url": e.get("payment_link_url"),
        })

    # Funnel by decline code + attempt number
    funnel: dict = {}
    for e in soft:
        code = e.get("error_reason") or "unknown"
        att = min(e.get("attempts") or 0, 5)  # cap at 5 for display
        key = f"{code}|attempt_{att}"
        funnel[key] = funnel.get(key, 0) + 1

    # Rail split
    rail_split = {}
    for e in events:
        rail = e.get("chosen_rail") or e.get("method") or "unknown"
        rail_split[rail] = rail_split.get(rail, 0) + 1

    # Hard decline list (last 20)
    hard_list = [
        {"payment_id": e["payment_id"], "reason": e.get("classify_reason"),
         "amount_inr": e["amount_paise"] / 100, "created_at": e.get("created_at")}
        for e in hard[-20:]
    ]

    return {
        "total_failed": total,
        "soft": len(soft),
        "hard": len(hard),
        "retries_scheduled": len(pending),
        "recovered": len(recovered),
        "merchant_cancelled": len(cancelled),
        "recovery_rate_pct": recovery_rate,
        "revenue_recovered_inr": revenue_recovered_inr,
        "channel_breakdown": channels,
        "pending_retries": pending_rows,
        "decline_funnel": funnel,
        "rail_split": rail_split,
        "hard_decline_list": hard_list,
    }


@router.get("/backtest")
def backtest():
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    try:
        from scripts.backtest import run
        return run(output_md=False)
    except Exception as e:
        return {"error": str(e)}


@router.post("/retry/{payment_id}/now")
def force_retry(payment_id: str):
    """Fire recovery immediately. Overrides timing only — run_recovery's guards still apply."""
    from src.recovery import run_recovery

    if not db.get_event(payment_id):
        return {"error": "unknown payment_id"}

    try:
        sched.scheduler.remove_job(payment_id)
    except Exception:
        pass

    db.log_audit(payment_id, "force_now", "manual force-fire, scheduler bypassed")
    run_recovery(payment_id)
    return {"fired": True, "event": db.get_event(payment_id)}


@router.get("/dashboard/audit")
def audit_trail(page: int = Query(1, ge=1), limit: int = Query(50, le=200)):
    offset = (page - 1) * limit
    rows = db.get_audit_log(limit=limit, offset=offset)
    return {"page": page, "limit": limit, "rows": rows}


@router.get("/dashboard/downtime")
def downtime_board():
    return {
        "active_downtimes": db.all_active_downtimes(),
        "queued_payments": db.all_downtime_queued(),
    }


@router.get("/dashboard/insights")
def insights():
    global _insights_cache
    now = time.time()
    if _insights_cache.get("ts") and now - _insights_cache["ts"] < _INSIGHTS_TTL:
        return _insights_cache["data"]

    events = db.all_events()
    soft = [e for e in events if e.get("classification") == "soft"]
    recovered = [e for e in events if e.get("recovered")]

    # Aggregate only — no PII in Claude payload
    reason_counts: dict = {}
    for e in soft:
        r = e.get("error_reason") or "unknown"
        reason_counts[r] = reason_counts.get(r, 0) + 1

    rail_counts: dict = {}
    for e in events:
        r = e.get("chosen_rail") or e.get("method") or "unknown"
        rail_counts[r] = rail_counts.get(r, 0) + 1

    skipped = sum(1 for e in events if e.get("classification") == "soft"
                  and not e.get("recovered") and not e.get("retry_at"))

    agg = {
        "total_failed": len(events),
        "soft": len(soft),
        "recovered": len(recovered),
        "skipped_uneconomic": skipped,
        "reason_counts": reason_counts,
        "rail_counts": rail_counts,
        "recovery_rate_pct": round(len(recovered) / len(soft) * 100, 1) if soft else 0,
    }

    result = _call_claude_insights(agg)
    _insights_cache = {"ts": now, "data": result}
    return result


def _call_claude_insights(agg: dict) -> dict:
    mock = {
        "insights": [
            {"finding": f"insufficient_funds accounts for {agg['reason_counts'].get('insufficient_funds', 0)} failures — payday-snapping targets this cohort",
             "source": "reason_counts.insufficient_funds"},
            {"finding": f"Recovery rate: {agg['recovery_rate_pct']}% (synthetic baseline)",
             "source": "recovery_rate_pct"},
            {"finding": f"{agg['skipped_uneconomic']} payments skipped as uneconomic (EV<0)",
             "source": "skipped_uneconomic"},
        ],
        "generated_by": "template (no API key)",
    }

    if not config.ANTHROPIC_API_KEY:
        return mock

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
        prompt = f"""You are analyzing aggregate payment failure data (no PII).
Data: {json.dumps(agg, indent=2)}

Return 3-4 concise actionable insights. Each must cite the specific aggregate number.
If data is insufficient for a finding, say "insufficient data" rather than speculating.

Respond as JSON: {{"insights": [{{"finding": "...", "source": "field_name"}}], "generated_by": "claude"}}
JSON only."""
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return json.loads(resp.content[0].text.strip())
    except Exception as e:
        mock["generated_by"] = f"template (error: {type(e).__name__})"
        return mock


@router.get("/dashboard/issuer-health")
def issuer_health():
    from src import config as cfg
    events = db.all_events()
    # Group by issuer+method, count recent failures
    issuers: dict = {}
    for e in events:
        issuer = e.get("card_issuer") or "unknown"
        method = e.get("method") or "card"
        key = f"{issuer}|{method}"
        if key not in issuers:
            issuers[key] = {"issuer": issuer, "method": method}
    result = []
    for key, meta in issuers.items():
        count = db.issuer_failure_count(
            meta["issuer"], meta["method"], cfg.ISSUER_DEGRADATION_WINDOW_MINUTES
        )
        status = "degraded" if count >= cfg.ISSUER_DEGRADATION_THRESHOLD else "healthy"
        result.append({**meta, "recent_failures": count, "status": status,
                        "threshold": cfg.ISSUER_DEGRADATION_THRESHOLD})
    return {"issuers": result, "window_minutes": cfg.ISSUER_DEGRADATION_WINDOW_MINUTES}


@router.get("/dashboard/funnel")
def recovery_funnel():
    events = db.all_events()
    audit = db.get_audit_log(limit=0)

    def _count_action(action: str) -> int:
        return sum(1 for r in audit if r["action"] == action)

    total_failed = len(events)
    classified_soft = sum(1 for e in events if e.get("classification") == "soft")
    classified_hard = sum(1 for e in events if e.get("classification") == "hard")
    compliance_blocked = _count_action("network_cap_block")
    ev_skipped = _count_action("skipped_uneconomic")
    trajectory_blocked = _count_action("trajectory_block")
    maintenance_snapped = _count_action("maintenance_window_snap")
    scheduled = _count_action("scheduled")
    fired = _count_action("recovery_attempt")
    nudged = sum(1 for e in events if e.get("nudge_channel"))
    recovered = sum(1 for e in events if e.get("recovered"))

    return {
        "total_failed": total_failed,
        "classified_soft": classified_soft,
        "classified_hard": classified_hard,
        "compliance_blocked": compliance_blocked,
        "ev_skipped": ev_skipped,
        "trajectory_blocked": trajectory_blocked,
        "maintenance_snapped": maintenance_snapped,
        "scheduled": scheduled,
        "fired": fired,
        "nudged": nudged,
        "recovered": recovered,
    }


@router.get("/dashboard/roi-projection")
def roi_projection(
    gmv_monthly: float = Query(5_000_000, ge=0),
    failure_rate_pct: float = Query(2.0, ge=0, le=100),
):
    failed_monthly = gmv_monthly * (failure_rate_pct / 100)
    control_rate = 0.455  # fixed 24h baseline from backtest
    agent_rate = 0.611    # ML-timed agent from backtest
    currently_recovered = failed_monthly * control_rate
    with_agent = failed_monthly * agent_rate
    monthly_lift = with_agent - currently_recovered
    annual_lift = monthly_lift * 12
    # Rough fine avoidance: assume 5% of failures are hard (domestic Visa rate)
    fines_annual = (failed_monthly * 0.05 * 8.30) * 12
    return {
        "note": "Projection based on synthetic backtest (circular validation). Not evidence of real-world lift.",
        "inputs": {"gmv_monthly_inr": gmv_monthly, "failure_rate_pct": failure_rate_pct},
        "failed_monthly_inr": round(failed_monthly, 2),
        "currently_recovered_inr": round(currently_recovered, 2),
        "with_agent_inr": round(with_agent, 2),
        "monthly_lift_inr": round(monthly_lift, 2),
        "annual_lift_inr": round(annual_lift, 2),
        "fines_avoided_annual_inr": round(fines_annual, 2),
        "control_rate_pct": round(control_rate * 100, 1),
        "agent_rate_pct": round(agent_rate * 100, 1),
    }


@router.get("/dashboard/fine-avoidance")
def fine_avoidance():
    rows = db.get_audit_log(limit=0)  # all rows
    hard_blocks = [r for r in rows if r["action"] == "hard_guard"]
    cap_blocks = [r for r in rows if r["action"] == "network_cap_block"]
    ct_blocks = [r for r in rows if r["action"] == "cardtesting_spacing_block"]

    # Look up event for each hard block to determine domestic vs cross-border
    domestic_fines = 0.0
    crossborder_fines = 0.0
    for r in hard_blocks:
        ev = db.get_event(r["payment_id"])
        if ev and ev.get("international"):
            crossborder_fines += 20.75
        else:
            domestic_fines += 8.30

    # MC excessive retry: ₹41.50 per cap-exceeded event
    mc_fines = sum(
        41.50 for r in cap_blocks
        if "mastercard" in (r.get("detail") or "").lower()
    )

    total = domestic_fines + crossborder_fines + mc_fines
    return {
        "fines_avoided_inr": round(total, 2),
        "blocked_hard_declines": len(hard_blocks),
        "blocked_cap_violations": len(cap_blocks),
        "blocked_card_testing": len(ct_blocks),
        "breakdown": {
            "visa_domestic_inr": round(domestic_fines, 2),
            "visa_crossborder_inr": round(crossborder_fines, 2),
            "mc_excessive_retry_inr": round(mc_fines, 2),
        },
    }


@router.get("/dashboard/model-health")
def model_health():
    from src import scheduler as sc
    bundle = sc._model_bundle
    if bundle is None:
        return {"model_loaded": False, "status": "red", "note": "model not trained"}

    clf = bundle["model"]
    feat_names = bundle.get("features", [])
    top5 = sorted(zip(feat_names, clf.feature_importances_), key=lambda x: -x[1])[:5]

    events = db.all_events()
    confidences = [e["confidence"] for e in events if e.get("confidence") is not None]
    last100 = confidences[-100:] if confidences else []
    mean_conf = round(sum(last100) / len(last100), 4) if last100 else None
    fallback_count = sum(1 for e in events if e.get("confidence") == 0.5)
    fallback_rate = round(fallback_count / len(events) * 100, 1) if events else 0.0

    status = "green" if mean_conf and mean_conf > 0.6 else ("amber" if mean_conf else "red")
    return {
        "model_loaded": True,
        "status": status,
        "top_features": [[n, round(float(w), 4)] for n, w in top5],
        "mean_confidence_last100": mean_conf,
        "fallback_rate_pct": fallback_rate,
    }


@router.get("/dashboard/cost-analysis")
def cost_analysis():
    events = db.all_events()
    recovered = [e for e in events if e.get("recovered")]
    nudged = [e for e in events if e.get("nudge_channel")]

    channel_costs = config.CHANNEL_COSTS_INR
    per_channel: dict = {}
    total_spend = 0.0
    for e in nudged:
        ch = e.get("nudge_channel") or "unknown"
        cost = channel_costs.get(ch, 0.0)
        per_channel[ch] = per_channel.get(ch, {"count": 0, "spend_inr": 0.0})
        per_channel[ch]["count"] += 1
        per_channel[ch]["spend_inr"] = round(per_channel[ch]["spend_inr"] + cost, 2)
        total_spend += cost

    revenue_recovered = sum(e.get("amount_paise", 0) for e in recovered) / 100
    net_roi = round(revenue_recovered - total_spend, 2)
    roi_multiple = round(revenue_recovered / total_spend, 1) if total_spend > 0 else None

    return {
        "total_nudge_spend_inr": round(total_spend, 2),
        "revenue_recovered_inr": round(revenue_recovered, 2),
        "net_roi_inr": net_roi,
        "roi_multiple": roi_multiple,
        "per_channel": per_channel,
        "note": "Cost rates are declared assumptions (see config.CHANNEL_COSTS_INR), not measured.",
    }


@router.delete("/retry/{payment_id}")
def cancel_retry(payment_id: str):
    try:
        sched.scheduler.remove_job(payment_id)
    except Exception:
        pass

    db.update_event(payment_id, merchant_cancelled=1)
    db.log_audit(payment_id, "merchant_cancelled", "manual cancel via dashboard")
    return {"cancelled": True}


@router.get("/{full_path:path}")
def spa_fallback(full_path: str):
    """Serve the built SPA. A real file under dist/ wins; everything else gets index.html
    so client-side routes deep-link. Registered last, so it never shadows an API route."""
    candidate = (_DIST / full_path).resolve()
    if _DIST in candidate.parents and candidate.is_file():
        return FileResponse(str(candidate))
    return FileResponse(str(_INDEX))
