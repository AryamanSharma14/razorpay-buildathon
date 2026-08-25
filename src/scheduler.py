"""ML retry scheduler: predict best retry window, schedule APScheduler job."""
import json
from datetime import datetime, timedelta

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
        network_enc, ctype_enc, issuer_enc,
    ] for h, f in zip(hours, futures)])

    probs = clf.predict_proba(rows)[:, 1]
    best_idx = int(probs.argmax())

    top3 = sorted(zip(feat_names, clf.feature_importances_), key=lambda x: -x[1])[:3]

    return {
        "delay_hours": int(hours[best_idx]),
        "confidence": round(float(probs[best_idx]), 4),
        "top_features": [[name, round(float(imp), 4)] for name, imp in top3],
    }


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


def schedule_retry(payment_id: str, delay_hours: int):
    from src.recovery import run_recovery  # late import avoids circular

    fire_at = datetime.utcnow() + timedelta(hours=delay_hours)
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
