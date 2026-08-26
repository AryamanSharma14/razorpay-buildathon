# Panel Q&A — Razorpay AI Buildathon 2026

Rehearse aloud. Each answer is max 90 seconds.

---

## On the numbers

**Q: Your backtest shows 66% for your policy vs 88.7% for razorpay_default. You're worse?**

The comparison is circular — ground truth comes from the same generator as training data, so more
attempts always wins on synthetic data. The load-bearing claims are different: our policy incurs **zero
network fines**, the aggressive policy incurs ₹300 in fines on the same run, and our policy is
compliance-bounded by design. Absolute recovery rates on synthetic data are artifacts of the
generator's coefficients. Real validation needs a live holdout group. We don't have one and we say so.

**Q: Your headline number is synthetic. Why should we believe any of it?**

We don't ask you to. The mechanism is the claim: we classify by cause (customer / permanent /
infrastructure), check compliance before every attempt (Visa Cat-1 guard, network caps), price the
decision (EV gate that refuses to chase), and route to a better rail when one exists. Those are
defensible independently of the backtest number. Published real-world bands: aggregate ML 22–40%,
best-in-class 45–60%. We model Razorpay's documented default as the control — not a strawman.

---

## On compliance

**Q: How do you avoid Visa/Mastercard retry violations?**

Two layers. Hard stop: we never retry Category 1 declines (issuer will never approve) — a finable
Visa rule violation at $0.10 domestic per attempt. Soft cap: we track attempts per credential per
rolling 30-day window; Visa allows 20 retries (raised from 15 in May 2025), Mastercard 10 per 24h
and 35 per 30d. The 21st attempt is blocked and audit-logged `network_cap_block`. This is
code-enforced and tested, not aspirational.

**Q: 20% of hard declines eventually succeed — why don't you retry them?**

Network rules forbid it. Category 1 is "issuer will never approve this credential" — retrying is a
compliance violation regardless of real-world success rates. Our response: route to a different rail.
If the card declined, we offer UPI on the recovery Payment Link. Compliant and recovers the revenue.

**Q: What about Indian messaging regulation?**

TCCCPR (amended Feb 2025): nudges sent hours/days post-transaction are Service Messages, not
Transactional. Consent validity is 7 days — we cap the campaign there. Promotional content mixed into
a service message reclassifies the whole message as promotional and triggers DND filtering. So: no
discounts, no incentives, urgency and payment-method options only. Razorpay confining its own reminders
to 11AM–12PM / 3PM–5PM is consistent with the same quiet-hours logic.

---

## On the architecture

**Q: What's the failure mode when the ML model is wrong?**

Bounded by design. Per-payment: attempt caps, spend caps, 7-day campaign limit. Per credential:
network compliance caps. Worst case is a wasted nudge — never a wrong charge. The EV gate adds another
layer: if the model picks a low-probability window on a small amount, the EV goes negative and we skip
the attempt rather than waste the channel cost.

**Q: What happens at 10,000 payments/second?**

SQLite + APScheduler is a prototype. Honest production path: Postgres for the event store, a durable
queue (SQS or Cloud Pub/Sub) for recovery jobs, a separate retry worker fleet that pulls from the
queue. The policy logic (classify → check compliance → compute EV → route rail) ports unchanged.
The scheduler becomes a queue consumer. We didn't build that because it adds infra, not ideas.

**Q: How do you prevent double-charging?**

Idempotency on `payment_id` throughout. The recovery creates exactly one Payment Link per failed
payment. Force-fire (`POST /retry/{id}/now`) checks for an existing pending link before creating one.
Every state change writes to `audit_log` — the full decision trail is queryable. Double-processing
would appear as a duplicate audit row with the same `payment_id`.

---

## On the AI / Claude usage

**Q: What stops Claude from hallucinating a revenue insight?**

Three controls. Input: aggregate-only (bucketed amounts, reason codes, issuer codes, outcomes — never
PII or individual payment data). Prompt: each insight must cite the aggregate behind it; explicit
instruction to say "insufficient data" rather than infer a pattern from noise. Output: cached per
stats snapshot, not re-called on every poll. Mock fallback offline. We moved Claude from copywriter
to analyst — that's the meaningful upgrade.

**Q: Your nudge is just a template. Where's the AI?**

Claude generates the nudge reasoning per payment — it sees the decline reason, the rail, the attempt
number, and produces the message text plus a stored `nudge_reasoning` explaining why. The stored
reasoning is visible in the dashboard so an audit can explain every sent message. More importantly,
Claude's other role is the insights endpoint: it reads aggregate recovery funnel data and surfaces
patterns a merchant should act on. That's the analyst use case, not the copywriter use case.

---

## On what we're NOT doing

**Q: Why no TokenHQ / account updater integration?**

We recover via Payment Link — the customer re-enters payment details. There is no stored token to
update. TokenHQ is a card-on-file / subscription-renewal tool. Our architecture is a different
re-entry flow. We acknowledge this in the panel and mark credential-repair as roadmap, not a gap we're
pretending not to see. A Razorpay judge who knows their own product should see that we thought it
through.

**Q: Why not Razorpay's built-in retry?**

Their documented default: 3 Payment Link reminders sent only in two fixed daytime slots (11AM–12PM,
3PM–5PM), same cadence regardless of decline reason. Subscriptions retry "the following day" then
halt. Not decline-aware, not cost-aware, no rail-switching, no compliance gate. We rebuilt the same
product and made it compliance/cause/cost-aware. The baseline we beat is their documented behaviour.
