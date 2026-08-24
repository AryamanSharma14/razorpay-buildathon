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


def _encode_method(val: str):
    enc = _model_bundle["method_enc"]
    try:
        return enc.transform([val])[0]
    except ValueError:
        return enc.transform(["card"])[0]


def _encode_reason(val: str):
    enc = _model_bundle["reason_enc"]
    try:
        return enc.transform([val])[0]
    except ValueError:
        return enc.transform(["payment_failed"])[0]


def predict_retry_window(features: dict) -> dict:
    """
    features: {method, international, error_reason, amount_paise}
    Returns {delay_hours, confidence, top_features}
    """
    if _model_bundle is None:
        return {"delay_hours": 1, "confidence": 0.5, "top_features": [["fallback", 1.0]]}

    clf = _model_bundle["model"]
    feat_names = _model_bundle["features"]
    importances = clf.feature_importances_

    method_enc = _encode_method(features.get("method", "card"))
    reason_enc = _encode_reason(features.get("error_reason", "payment_failed"))
    intl = int(features.get("international", False))
    ab = _amount_bucket(features.get("amount_paise", 0))

    now = datetime.utcnow()
    best_hour_offset = 1
    best_prob = 0.0

    for h in range(1, 49):
        future = now + timedelta(hours=h)
        row = np.array([[
            future.hour,
            future.weekday(),
            method_enc,
            intl,
            reason_enc,
            ab,
        ]])
        prob = clf.predict_proba(row)[0][1]
        if prob > best_prob:
            best_prob = prob
            best_hour_offset = h

    top3 = sorted(zip(feat_names, importances), key=lambda x: -x[1])[:3]
    top_features = [[name, round(float(imp), 4)] for name, imp in top3]

    return {
        "delay_hours": best_hour_offset,
        "confidence": round(float(best_prob), 4),
        "top_features": top_features,
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
