# What Broke — Honest Log

> This is the graded submission requirement. Judges reward documented resilience more than uncaught problems.

---

## 1. Started in the wrong track

**What happened:** v1 of this project targeted Track 1 (generic LLM workflow). After the first day of
research it became obvious the problem was squarely Track 2 (payment recovery), which has primary-source
domain knowledge (Visa operating rules, TRAI TCCCPR, Razorpay's own product docs) that would be visible
to any judge. We pivoted, rewrote the strategy doc, and rebuilt.

**Why it matters:** the reframe changed what we measure (compliance first, lift second), what Claude
does (analyst not copywriter), and the entire positioning. Losing ~6 hours to the pivot was the right
trade.

---

## 2. Python 3.12 numpy wheel failure

**What happened:** initial `py -3.12` environment blew up at `pip install numpy` — no pre-built wheel
for the target platform. Scikit-learn requires numpy, so the whole ML stack was blocked.

**Fix:** downgraded to Python 3.10 (`py -3.10 -m venv .venv`). Documented in CLAUDE.md so it doesn't
get re-discovered.

---

## 3. No re-charge API — recovery had to become a Payment Link

**What happened:** the naive design assumed we could re-initiate a charge against the same stored card.
Razorpay does not expose a re-charge endpoint; the only re-entry mechanism is a new Payment Link where
the customer re-enters payment details.

**Consequence:** credential-repair (TokenHQ / account updater) is not feasible in our architecture —
those levers work on stored tokens, and we have no stored token to update. We scoped it to roadmap and
pivoted nudge strategy to rail-switching (card → UPI) instead.

---

## 4. End-to-end flow untested for the first ~20 hours

**What happened:** `run_recovery()` was written and unit-tested in isolation. The actual path
webhook → classify → schedule → fire → create Payment Link → send nudge had never been run end-to-end
until Phase 0.

**What we found when we did run it:** `DEMO_MODE` branching was missing in the nudge sender; the
Payment Link mock wasn't wired; the `payment_link.paid` webhook handler wrote to a non-existent column.
All fixed in Phase 0.

**Lesson:** integration tests exist for exactly this. We had none covering the happy path.

---

## 5. Retry window structurally excluded most recovery mass

**What happened:** `scheduler.predict_retry_window()` originally scanned **1–48 hours**. Primary-source
data shows:

- ~8% of soft-decline recoveries happen same-day
- >60% happen 1–7 days later
- 90% land within 10 days

We were scheduling retries entirely in the wrong part of the distribution. **Fix: widened to 1–240 hours.**
The model's `hours_since_failure` feature now carries 0.555 importance — the single strongest signal
post-fix, up from absent.

---

## 6. Webhook payload features were unused in training

**What happened:** the `payment.failed` webhook carries `card.network`, `card.type` (debit/credit),
`card.issuer`, and `card.iin`. We were training only on `hour_of_day`, `day_of_week`, `method`, `reason`,
`amount_bucket`. Issuer and card type are the features that the industry (Stripe, Checkout.com) report
as primary retry signals.

**Fix:** added all four card-level fields to both `generate_training_data.py` and `train_model.py`.
Combined importance ~0.054 — modest given synthetic provenance, but now present and honest.

---

## 7. Backtest numbers degraded after apples-to-apples budget equalization

**What happened:** early backtest (before policy comparison) showed `ours_ml_payday` at ~61% vs a
naive fixed-24h baseline at ~45.5% — a +15.6pt headline that felt good. When we introduced a proper
`razorpay_default` policy (3 reminders, two fixed daytime slots, their documented behaviour) and
equalized attempt budgets (both policies get 3 attempts), the picture reversed: `razorpay_default`
reached 88.7% vs `ours` at 66.0%.

**Why this happened:** our ML model picks the single best timing window; `razorpay_default` exhausts
its budget with 3 attempts per payment. On fully synthetic data where the generator makes recoveries
likely, more attempts always wins. The comparison is circular — we train and test on the same generator.

**What we do with it:** report it honestly. Absolute rates are artifacts of the generator's coefficients.
The load-bearing claims are: (a) our policy incurs **zero network fines**; (b) the aggressive policy
incurs fines and wasted attempts; (c) we provide the *compliance-bounded* option. We do not claim
headline lift on this backtest — that would require a real holdout group.

---

## 8. Discount-in-nudge idea violated TRAI TCCCPR

**What happened:** v1 plan included a discount offer on attempt 3 to increase urgency. Research turned
up TCCCPR (amended 2025-02-12): mixing promotional content into a service message reclassifies the
entire message as promotional, triggering DND filtering and opt-out obligations.

**Fix:** removed all pricing/incentive language from nudge templates. Escalate urgency and
payment-method options only. Cap campaign at 7 days (explicit-consent validity). This became an
explicit compliance pillar in the pitch.

---

## 9. SQLite + APScheduler is a prototype, not a production scheduler

**What happens at scale:** SQLite write-locks on concurrent webhook bursts; APScheduler's in-memory
job store loses state on restart. For 10,000 payments/sec the honest architecture is Postgres + a
durable queue (SQS/Pub-Sub) + a separate retry worker fleet.

**Why we kept it:** the prototype is sufficient to prove the policy logic and demonstrate every
compliance/cause/cost decision. The architecture note belongs in the README and in panel Q&A, not
hidden.

---

## 10. No live merchant data — validation is circular

**The gap:** backtest ground truth is generated by the same function that created training data.
It proves the scheduler finds the optimum the data encodes; it is not evidence about real merchants.
Real validation requires a holdout group receiving the ML policy vs a control group receiving the
current Razorpay default — an A/B test we cannot run without a live merchant.

**What we say:** published real-world bands are 22–40% (aggregate ML) to 45–60% (best-in-class).
Our synthetic control (`razorpay_default`) is modelled on their documented behaviour, not a strawman.
The mechanism is defensible; the exact number is not.

---

## 11. Frontend build was emitting to the wrong directory

**What happened:** `vite.config.ts` had no `outDir`, so `npm run build` wrote to
`frontend/dist/` — while FastAPI serves `src/web/dist/`. The committed dashboard was a stale
scaffold build and every "rebuild" silently changed nothing the server could see.

**Fix:** `build.outDir: '../src/web/dist'` + `emptyOutDir: true`. Verified: fresh hashed assets
appear in `GET /` immediately after build. Documented in `docs/frontend-status.md`.

---

## 12. Playwright webServer path broke on Windows

**What happened:** `playwright.config.ts` launched the test server with
`'../.venv/Scripts/python.exe -m uvicorn ...'`. Playwright spawns that through Windows cmd,
which cannot resolve a relative exe path — `'..' is not recognized as an internal or external
command` — so every e2e run died before a single test.

**Fix:** compute an absolute, quoted path from `import.meta.url`
(`path.join(repoRoot, '.venv', 'Scripts', 'python.exe')`) and pass it as `command`, with
`cwd: repoRoot`. All 3 e2e specs now pass against the real DEMO_MODE server on :8123.
