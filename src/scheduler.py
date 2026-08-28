"""ML retry scheduler: predict best retry window, schedule APScheduler job."""
import json
from datetime import datetime, timedelta, date, timezone

import joblib
import numpy as np
from apscheduler.schedulers.background import BackgroundScheduler

from src import db

_model_bundle = None
scheduler = BackgroundScheduler()


def load_model():
    global _model_bundle
    try:
        _model_bundle = joblib.load("models/retry_model.pkl")
    except FileNotFoundError:
        _model_bundle = None


# >60% of insufficient-funds recoveries land 1-7 days out and 90% within 10 days, so a
# 48h horizon structurally excludes most of the recovery mass. See docs/research-brief.md.
MAX_HORIZON_HOURS = 240


def _encode(enc_key: str, val: str, fallback: str):
    enc = _model_bundle[enc_key]
    try:
        return enc.transform([str(val)])[0]
    except ValueError:
        return enc.transform([fallback])[0]


def predict_retry_window(features: dict) -> dict:
    """
    features: {method, international, error_reason, amount_paise, card_network, card_type, card_issuer}
    Returns {delay_hours, confidence, top_features}
    """
    if _model_bundle is None:
        return {"delay_hours": 1, "confidence": 0.5, "top_features": [["fallback", 1.0]]}

    clf = _model_bundle["model"]
    feat_names = _model_bundle["features"]

    method = features.get("method", "card")
    is_card = method == "card"
    method_enc = _encode("method_enc", method, "card")
    reason_enc = _encode("reason_enc", features.get("error_reason", "payment_failed"), "payment_failed")
    network_enc = _encode("card_network_enc", features.get("card_network") or ("Visa" if is_card else "none"), "none")
    ctype_enc = _encode("card_type_enc", features.get("card_type") or ("credit" if is_card else "none"), "none")
    issuer_enc = _encode("card_issuer_enc", features.get("card_issuer") or ("OTHER" if is_card else "none"), "none")
    intl = int(features.get("international", False))
    ab = _amount_bucket(features.get("amount_paise", 0))

    now = datetime.utcnow()
    hours = np.arange(1, MAX_HORIZON_HOURS + 1)
    futures = [now + timedelta(hours=int(h)) for h in hours]
    rows = np.array([[
        f.hour, f.weekday(), int(h), method_enc, intl, reason_enc, ab,
        network_enc, ctype_enc, issuer_enc, int(_is_payday(f)),
    ] for h, f in zip(hours, futures)])

    probs = clf.predict_proba(rows)[:, 1]
    best_idx = int(probs.argmax())

    top3 = sorted(zip(feat_names, clf.feature_importances_), key=lambda x: -x[1])[:3]

    return {
        "delay_hours": int(hours[best_idx]),
        "confidence": round(float(probs[best_idx]), 4),
        "top_features": [[name, round(float(imp), 4)] for name, imp in top3],
    }


_PSU_ISSUERS = {"sbi", "bob", "pnb", "canara", "bank of baroda", "punjab national bank", "canara bank"}


def _is_payday(dt: datetime) -> bool:
    """Friday or 1st/15th of month (salary credit windows in India)."""
    return dt.weekday() == 4 or dt.day in (1, 15)


def _is_govt_payday(dt: datetime) -> bool:
    """7th of month: govt employee salary credit date (PSU banks)."""
    return dt.day == 7


def _next_payday_window(after: datetime, issuer: str = "") -> datetime:
    """First payday window at 10:00 AM UTC after `after`.
    PSU issuers: also check 7th of month (govt salary date)."""
    is_psu = (issuer or "").lower() in _PSU_ISSUERS
    candidate = after.replace(hour=10, minute=0, second=0, microsecond=0)
    if candidate <= after:
        candidate += timedelta(days=1)
        candidate = candidate.replace(hour=10, minute=0, second=0, microsecond=0)
    for _ in range(35):  # at most 5 weeks scan
        if _is_payday(candidate) or (is_psu and _is_govt_payday(candidate)):
            return candidate
        candidate += timedelta(days=1)
        candidate = candidate.replace(hour=10, minute=0, second=0, microsecond=0)
    return after  # fallback: original time


_IST = timedelta(hours=5, minutes=30)


def _snap_maintenance(dt_utc: datetime, issuer: str) -> datetime:
    """Snap dt_utc past the bank maintenance window for this issuer. Returns dt_utc unchanged if clear."""
    from src import config
    windows = config.BANK_MAINTENANCE_WINDOWS.get((issuer or "").lower(), config._MAINTENANCE_DEFAULT)
    dt_ist = dt_utc + _IST
    ist_min = dt_ist.hour * 60 + dt_ist.minute
    for start_m, end_m in windows:
        in_window = (ist_min >= start_m or ist_min < end_m) if start_m > end_m else (start_m <= ist_min < end_m)
        if in_window:
            snap_ist = dt_ist.replace(hour=end_m // 60, minute=end_m % 60, second=0, microsecond=0)
            if snap_ist <= dt_ist:
                snap_ist += timedelta(days=1)
            return snap_ist - _IST
    return dt_utc


def _amount_bucket(amount_paise: int) -> int:
    if amount_paise < 10000:
        return 0
    if amount_paise < 50000:
        return 1
    if amount_paise < 200000:
        return 2
    if amount_paise < 1000000:
        return 3
    return 4


def schedule_retry(payment_id: str, delay_hours: int, error_reason: str = "", issuer: str = "",
                   method: str = "card"):
    from src.recovery import run_recovery  # late import avoids circular
    from src import config

    # Issuer health: if failure volume exceeds threshold in recent window, park for 1h
    if issuer:
        failure_count = db.issuer_failure_count(issuer, method,
                                                config.ISSUER_DEGRADATION_WINDOW_MINUTES)
        if failure_count >= config.ISSUER_DEGRADATION_THRESHOLD:
            park_until = (datetime.utcnow() + timedelta(hours=1)).isoformat()
            db.update_event(payment_id, retry_at=park_until)
            db.log_audit(payment_id, "issuer_degraded_park",
                         f"issuer={issuer} failures={failure_count}/"
                         f"{config.ISSUER_DEGRADATION_THRESHOLD} in "
                         f"{config.ISSUER_DEGRADATION_WINDOW_MINUTES}min → park 1h")
            return

    fire_at = datetime.utcnow() + timedelta(hours=delay_hours)

    if error_reason == "insufficient_funds" and not _is_payday(fire_at):
        snapped = _next_payday_window(fire_at, issuer=issuer)
        db.log_audit(payment_id, "payday_snapped",
                     f"ml={fire_at.isoformat()} -> payday={snapped.isoformat()}")
        fire_at = snapped

    snapped = _snap_maintenance(fire_at, issuer)
    if snapped != fire_at:
        db.log_audit(payment_id, "maintenance_window_snap",
                     f"issuer={issuer} orig={fire_at.isoformat()} snap={snapped.isoformat()}")
        fire_at = snapped

    retry_at = fire_at.isoformat()

    try:
        scheduler.add_job(
            run_recovery,
            trigger="date",
            run_date=fire_at,
            id=payment_id,
            args=[payment_id],
            replace_existing=True,
        )
    except Exception as e:
        db.log_audit(payment_id, "schedule_error", str(e))
        return

    db.update_event(payment_id, retry_at=retry_at)
    db.log_audit(payment_id, "scheduled", f"delay={delay_hours}h fire_at={retry_at}")
    from src import events
    events.push("scheduled", payment_id, {"retry_at": retry_at, "delay_hours": delay_hours})
