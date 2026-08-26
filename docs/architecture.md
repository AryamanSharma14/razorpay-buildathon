# Architecture

## Flow

```
[Customer]
    |
    | payment attempt fails
    v
[Razorpay] --payment.failed webhook--> [POST /webhook/razorpay]
                                              |
                                        HMAC-SHA256 verify
                                              |
                                        extract entity fields
                                        (error_source, error_step, error_reason)
                                              |
                                       [classifier.py]
                                        classify() pure fn
                                              |
                          +-----------+-------+-----------+
                          |                               |
                        HARD                           SOFT
                   (card_expired,               (insufficient_funds,
                  incorrect_details)             timeout, gateway_err)
                          |                               |
                    hard_stop audit            [scheduler.py]
                    retry_at=NULL              predict_retry_window()
                    return 200                 GradientBoosting model
                                               48h candidate grid
                                               pick max P(success)
                                                       |
                                               APScheduler date job
                                               store retry_at, confidence
                                               top_features (JSON)
                                                       |
                                               [run_recovery()]
                                                       |
                                          +---------------------------+
                                          |                           |
                                   guard checks               [recovery.py]
                                   (hard/recovered/           create_payment_link()
                                    cancelled)                POST /v1/payment_links
                                                             Razorpay API (real)
                                                             store short_url
                                                                   |
                                                            [nudge.py]
                                                            generate_message()
                                                            claude-haiku-4-5
                                                            -> message + reasoning
                                                                   |
                                                            dispatch chain:
                                                            WhatsApp (Twilio)
                                                            -> Email (SendGrid)
                                                            -> mock log
                                                                   |
                                                            attempt < 3?
                                                            reschedule next window
                                                            else give_up audit

[Razorpay] --payment_link.paid webhook--> [POST /webhook/razorpay]
                                                |
                                          match notes.recovery_for
                                          update recovered=1
                                          remove APScheduler job
                                          audit "recovered"

[Merchant] --GET /--> [dashboard.html]
           --GET /dashboard/stats--> live JSON (polls 3s)
           --DELETE /retry/{id}--> cancel job + merchant_cancelled=1
           --GET /backtest--> run simulation, return recovery rate
```

## Components

| File | Role |
|---|---|
| `src/main.py` | FastAPI app, startup init (DB + model + scheduler) |
| `src/config.py` | Env loading, fail-fast validation |
| `src/db.py` | SQLite helpers: `insert_event`, `update_event`, `log_audit` |
| `src/classifier.py` | Pure `classify()` — deterministic hard/soft from error fields |
| `src/webhook.py` | HMAC verify, `payment.failed` + `payment_link.paid` handlers |
| `src/scheduler.py` | GradientBoosting model, 48h grid search, APScheduler jobs |
| `src/recovery.py` | `run_recovery()`: guard checks, Payment Link creation, reschedule |
| `src/nudge.py` | Claude haiku-4-5 message gen, multi-channel dispatch, fallback |
| `src/dashboard.py` | `/dashboard/stats`, `/backtest`, `/retry/{id}` DELETE, serve HTML |
| `src/web/dashboard.html` | Vanilla JS dashboard, polls stats, dual explainability table |
| `scripts/generate_training_data.py` | 10k synthetic rows, fixed seed 42 |
| `scripts/train_model.py` | GradientBoosting fit, save pkl with encoders |
| `scripts/backtest.py` | Held-out 20% test, simulate recovery, honest framing |
| `scripts/fire_test_webhook.py` | Dev/demo webhook sender, presets soft/hard |

## API Surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/ping` | Health check |
| POST | `/webhook/razorpay` | Razorpay webhook receiver |
| GET | `/` | Dashboard HTML |
| GET | `/dashboard/stats` | Live stats JSON |
| DELETE | `/retry/{payment_id}` | Merchant cancel override |
| GET | `/backtest` | Run backtest simulation |

## DB Schema (SQLite)

Two tables: `events` (one row per failed payment) + `audit_log` (every state change).
See `src/db.py` for full schema.

## Corrected Facts

Razorpay has no "card retry API". A failed payment is terminal.
Recovery = create a new **Payment Link** (`POST /v1/payment_links`) and send `short_url` to customer.
Classification signal is `error_source` + `error_step` + `error_reason` on the payment entity —
not MAC/bank codes (those are secondary enrichment only).
