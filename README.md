# Razorpay AI Buildathon — Compliance-Bounded Recovery Agent

> Most recovery systems ask **"when should I retry?"**  
> We ask **"am I allowed to retry, was this even the customer's fault, and is it worth what it costs?"**

A recovery agent for failed payments that treats compliance, cause, and cost as first-class inputs —
not afterthoughts.

---

## What it does

Every failed payment enters a decision pipeline:

1. **Classify the cause** — soft (retry-eligible) · hard (permanently blocked, Visa Category 1) ·
   infrastructure (bank was down, not the customer's fault)
2. **Check compliance before each attempt** — Visa Cat-1 guard, rolling network caps (Visa 20/30d,
   Mastercard 10/24h + 35/30d), card-testing-safe spacing
3. **Compute expected value** — `EV = p_recover × amount − channel_cost`; if all channels negative,
   skip with arithmetic visible in the audit log
4. **Route to the best rail** — insufficient-funds / issuer declines → offer UPI Autopay; snap retry
   timing to payday windows (1st, 15th, Fridays)
5. **Park infrastructure failures** — `payment.downtime.started` → hold queue keyed to downtime;
   `payment.downtime.resolved` → drain immediately
6. **Send a compliant nudge** — no promotional content (TRAI TCCCPR), 7-day campaign cap,
   Claude-generated reasoning stored per message
7. **Write everything to the audit trail** — every decision, skip, cap hit, and routing call is
   queryable; full explainability for every retry

Claude acts as an analyst, not a copywriter: `GET /dashboard/insights` returns 3–4 aggregate-backed
revenue patterns with an explicit instruction to say "insufficient data" rather than invent.

---

## Prerequisites

- Python 3.10 (**not 3.12** — no numpy wheel)
- Razorpay test-mode API keys (or run fully offline with `DEMO_MODE=true`)
- Anthropic API key (or offline — Claude calls fall back to mock)

---

## Setup

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env    # fill in keys, or leave DEMO_MODE=true for offline
```

---

## Run

```powershell
# Start server
uvicorn src.main:app --reload --port 8000

# Dashboard
# http://localhost:8000/dashboard

# One-command offline demo (time-travel: 7-day lifecycle in seconds)
python scripts/demo.py --reset

# Tests
pytest -q    # 56 passed
```

---

## Demo scenarios covered

| Scene | What it shows |
|---|---|
| Soft decline → ML-timed retry | Payday-snapped retry window, top-feature explainability |
| Card → UPI rail switch | Multi-rail routing on issuer decline |
| EV gate refuses tiny amount | Arithmetic on screen: `EV = ₹0.18 − ₹0.35 = −₹0.17 → skipped` |
| Bank downtime → queue → drain | Infrastructure class; auto-drain on `resolved` |
| Network cap block | 21st attempt blocked `network_cap_block`, audit row visible |
| Hard decline — zero attempts | Visa Cat-1 guard holds through every entry point |
| Claude analyst insight | Aggregate funnel → actionable pattern, no PII |

---

## Architecture

```
webhook.py          ← receives payment.failed / downtime.* / payment_link.paid
  └─ classifier.py  ← soft / hard / infrastructure
       └─ recovery.py  ← EV gate → rail selection → Payment Link → nudge
            └─ scheduler.py  ← APScheduler, payday-snapped, network-cap-checked
                 └─ compliance.py  ← Visa/MC caps, card-testing spacing
db.py               ← SQLite: events, audit_log, network_attempts, downtime tables
dashboard.py        ← FastAPI: stats, audit trail, downtime board, Claude insights
```

**Prototype scope:** SQLite + APScheduler. Production path: Postgres + durable queue (SQS/Pub-Sub) +
worker fleet. The policy logic ports unchanged — the queue consumer replaces the scheduler.

---

## Numbers (honest framing)

Backtest is synthetic — ground truth from the same generator as training. Proves the scheduler finds
the optimum the data encodes; not evidence about real merchants.

| What matters | Value |
|---|---|
| Network fines — our policy | ₹0 |
| Network fines — aggressive policy (same run) | ₹300 |
| Hard declines retried | 0 |
| Hard declines blocked (force-fire attempt) | ✓ |

Published real-world bands for context: aggregate ML 22–40%, best-in-class 45–60%. We model
Razorpay's documented default (3 reminders, two fixed daytime slots) as the control — not a strawman.

---

## Key docs

| Doc | Contents |
|---|---|
| `docs/what-broke.md` | Honest failure log — 10 things that broke and what we learned |
| `docs/panel-qa.md` | Written answers to expected judge questions |
| `docs/win-plan.md` | Strategy and positioning rationale |
| `docs/research-brief.md` | Primary-source citations for every compliance claim |
| `docs/backtest_results.md` | Full policy comparison with denominator and honesty note |
| `docs/decisions/` | ADRs for non-obvious architectural choices |
