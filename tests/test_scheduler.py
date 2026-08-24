import pytest
from src import scheduler as sched


def test_fallback_without_model():
    sched._model_bundle = None
    result = sched.predict_retry_window({"method": "card", "error_reason": "payment_failed"})
    assert result["delay_hours"] == 1
    assert result["confidence"] == 0.5
    assert len(result["top_features"]) >= 1


def test_predict_with_model():
    sched.load_model()
    if sched._model_bundle is None:
        pytest.skip("model file not trained yet")
    result = sched.predict_retry_window({
        "method": "card",
        "international": False,
        "error_reason": "insufficient_funds",
        "amount_paise": 50000,
    })
    assert 0 < result["delay_hours"] <= 48
    assert len(result["top_features"]) == 3
    assert result["confidence"] > 0


def test_predict_delay_positive():
    sched.load_model()
    if sched._model_bundle is None:
        pytest.skip("model not trained")
    result = sched.predict_retry_window({
        "method": "upi",
        "international": False,
        "error_reason": "gateway_error",
        "amount_paise": 100000,
    })
    assert result["delay_hours"] >= 1
