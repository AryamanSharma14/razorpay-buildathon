from src.classifier import classify, HARD_REASONS, classify_trajectory


def test_insufficient_funds_is_soft():
    r = classify("bank", "payment_authorization", "insufficient_funds")
    assert r["type"] == "soft"
    assert r["action"] == "schedule_retry"


def test_card_expired_is_hard():
    r = classify("customer", "payment_authentication", "card_expired")
    assert r["type"] == "hard"
    assert r["action"] == "request_card_update"


def test_incorrect_card_details_is_hard():
    r = classify("customer", "payment_authentication", "incorrect_card_details")
    assert r["type"] == "hard"


def test_payment_timeout_is_soft():
    r = classify("gateway", "payment_authorization", "payment_timeout")
    assert r["type"] == "soft"


def test_gateway_source_is_soft():
    r = classify("gateway", "payment_initiation", "gateway_error")
    assert r["type"] == "soft"


def test_unknown_reason_defaults_soft():
    r = classify("", "", "some_weird_code")
    assert r["type"] == "soft"
    assert r.get("low_confidence")


def test_no_hard_reason_ever_retries():
    for reason in HARD_REASONS:
        r = classify("customer", "payment_authentication", reason)
        assert r["type"] == "hard", f"{reason} should be hard"
        assert r["action"] != "schedule_retry", f"{reason} should never schedule retry"


def test_do_not_honor_is_soft():
    r = classify("bank", "payment_authorization", "do_not_honor")
    assert r["type"] == "soft"


def test_otp_abandoned_is_soft_with_fast_retry():
    r = classify("customer", "payment_authentication", "payment_cancelled")
    assert r["type"] == "soft"
    assert r.get("fast_retry") is True
    assert "abandoned_otp" in r["reason"]


def test_otp_abandoned_user_dropped():
    r = classify("customer", "payment_authentication", "user_dropped")
    assert r["type"] == "soft"
    assert r.get("fast_retry") is True


def test_payment_cancelled_non_auth_step_not_fast_retry():
    # payment_cancelled at a non-authentication step is not an OTP drop
    r = classify("customer", "payment_initiation", "payment_cancelled")
    assert not r.get("fast_retry")


def test_trajectory_escalating_detected():
    history = [{"error_reason": "insufficient_funds"}, {"error_reason": "do_not_honor"}]
    assert classify_trajectory(history) == "trajectory_escalating"


def test_trajectory_ok_for_safe_sequence():
    history = [{"error_reason": "payment_timeout"}, {"error_reason": "insufficient_funds"}]
    assert classify_trajectory(history) == "ok"
