# Decline-Aware Recovery Orchestrator

AI-powered payment recovery: classifies failed payments by decline code, schedules retries at ML-predicted optimal windows, generates Claude-explained customer nudges, and creates real Razorpay Payment Links — all with a live explainability dashboard.

## Prerequisites

- Python 3.10+
- Razorpay test-mode keys (`rzp_test_*`)
- Optional: Anthropic API key (nudge generation), Twilio/SendGrid (dispatch)

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
# Fill in .env with your keys
```

## Run

```powershell
uvicorn src.main:app --reload --port 8000
# Open http://localhost:8000
```

## Demo Path

```powershell
# Fire a soft decline (bank/insufficient_funds)
python scripts/fire_test_webhook.py --preset soft

# Fire a hard decline (customer/card_expired) — never retried
python scripts/fire_test_webhook.py --preset hard

# Open dashboard
start http://localhost:8000
```

## Backtest

```powershell
python scripts/backtest.py
# 67.2% soft-decline recovery rate on held-out test set (mechanism validation, synthetic data)
```

## Test

```powershell
pytest -q
```

## Architecture

```
payment.failed webhook
    -> HMAC verify
    -> classify (error_source/step/reason)
        -> HARD: log hard_stop, no retry
        -> SOFT: ML predict best retry window (GradientBoosting, 48h grid)
            -> APScheduler job
            -> run_recovery: create Razorpay Payment Link (real API)
            -> Claude haiku-4-5 generates customer nudge + reasoning
            -> dispatch: WhatsApp -> Email -> SMS (mock fallback)
payment_link.paid webhook -> mark recovered
Dashboard: live stats, explainability (ML top_features + Claude reasoning), cancel override
```

## Key Invariants

- Hard declines (`card_expired`, `incorrect_card_details`, etc.) never retried
- Every state change written to `audit_log` table
- Missing API keys never crash — mock fallback via `DEMO_MODE=true`
- Recovery = new Payment Link (Razorpay's actual mechanism), never a fake re-charge
- Backtest numbers labeled "simulated / mechanism validation"
