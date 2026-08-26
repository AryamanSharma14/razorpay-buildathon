"""Backtest policy tests — must run after train_model.py."""
import pytest


def test_aggressive_incurs_fines():
    try:
        from scripts.backtest import run
        result = run(output_md=False)
    except FileNotFoundError:
        pytest.skip("model or training data not generated")
    assert result["aggressive_fines_inr"] > 0, "Aggressive policy must incur network fines"


def test_ours_incurs_no_fines():
    try:
        from scripts.backtest import run
        result = run(output_md=False)
    except FileNotFoundError:
        pytest.skip("model or training data not generated")
    assert result["ours_fines_inr"] == 0.0, "Our policy must not incur network fines"


def test_backtest_returns_all_policies():
    try:
        from scripts.backtest import run
        result = run(output_md=False)
    except FileNotFoundError:
        pytest.skip("model or training data not generated")
    policy_names = {p["policy"] for p in result["policies"]}
    assert "no_retry" in policy_names
    assert "razorpay_default" in policy_names
    assert "retry_all_aggressive" in policy_names
    assert "ours_ml_payday" in policy_names
