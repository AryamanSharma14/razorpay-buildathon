# Dashboard Redesign — Slash-style restyle, simpler IA, demo wow-factor

**Date:** 2026-08-28
**Status:** Phase 1 shipped (`bc3d824`) · Phase 2 next · Phase 3 pending
**Freeze:** 2026-09-02 · **Submit:** 2026-09-05

## Progress

- **Phase 1 — Visual restyle — DONE (2026-08-28, `bc3d824`).** Token *values* swapped to Slash
  palette, names kept → all 12 pages restyled without per-page edits. `lib/outcome.ts` +
  `outcome.test.ts` added. Fonts loaded. Pills/borders/serif applied. Analytics + Simulator hex
  refs migrated. vite build + 4 vitest + 4 e2e + 108 pytest green. Server smoke-tested on :8000.
- **Phase 2 — Simpler IA — NEXT.**
- **Phase 3 — Wow + QoL — PENDING.**

## Problem

The current React dashboard (12 pages, 6 nav groups) is functionally complete but:
- **Too complex for a first-time viewer.** A judge or merchant hits a wall of 12 equally-weighted
  pages with overlapping content (Overview vs Funnel vs Analytics all show decline data). No obvious
  "what is this / is it working / what do I do next".
- **No visual identity.** System-font dark theme, generic. Doesn't read as a serious fintech product.
- **Missing operator quality-of-life.** No CSV export, reset is buried in the Simulator, no
  copy-to-clipboard on payment IDs, dead-looking empty states, no keyboard shortcuts, no global date
  filter (backend already supports `from_date`/`to_date` on `/dashboard/stats`).
- **No memorable demo moment.** The 5-minute panel demo relies on the presenter narrating over raw
  event logs.

## Goals

1. A **simple Home** anyone understands in 5 seconds, with one obvious next step.
2. **Advanced** section holding the depth, reorganised from 12 → ~9 pages via light merges.
3. A **coherent visual identity** (Slash style reference: obsidian canvas, copper accent, Playfair
   Display serif for display type, Inter for UI).
4. **Operator QoL**: CSV export, top-bar reset, copy-ID, guided empty states, keyboard shortcuts,
   global date range.
5. **Demo wow-factor**: Presenter Mode, Decision Cards, animated pipeline strip, verdict banners,
   count-up numbers, before/after toggle, consistent outcome language, branding.

## Non-Goals

- No backend API changes. Every endpoint stays as-is. (Date range reuses the existing
  `from_date`/`to_date` params; CSV is client-side from already-fetched data.)
- No new runtime dependencies beyond: `react-countup` (or hand-rolled), Google Fonts (Playfair
  Display + Inter). Everything else is already installed (Framer Motion, Recharts, lucide-react).
- No auth, no multi-tenant, no persistence of user preferences beyond `localStorage`.
- No change to the compliance invariants or the ML/scheduler logic.

## Visual System — Slash style reference

### Tokens (replace `frontend/src/index.css` `@theme` block)

```
--color-obsidian:  #08080a   /* page canvas */
--color-onyx:      #040406   /* card surface */
--color-carbon:    #121317   /* elevated panel, input bg */
--color-graphite:  #1c1d22   /* hairline border, icon well */
--color-slate:     #2e3038   /* secondary border */
--color-ash:       #5e616e   /* muted text, placeholder */
--color-steel:     #777a88   /* button border, secondary text */
--color-fog:       #9194a1   /* nav text, helper text */
--color-mist:      #acafb9   /* subdued body */
--color-bone:      #e2e3e9   /* DEFAULT body text */
--color-paper:     #ffffff   /* headings, primary action fill, "recovered" state */
--color-copper:    #cc9166   /* editorial links, category labels, "blocked" state */
--gradient-gilded: linear-gradient(103deg, rgb(174,147,87), rgb(255,240,204) 40%, rgb(174,147,87) 70%, rgba(189,157,79,0))

--radius-nav: 2px · --radius-card: 10px · --radius-full: 9999px
--font-serif: 'Playfair Display', Georgia, serif   /* headings ≥28px, big numbers ONLY */
--font-sans:  'Inter', ui-sans-serif, system-ui, sans-serif
--font-mono:  'JetBrains Mono', ui-monospace, monospace   /* payment IDs, code only */
```

### Rules
- **Serif (Playfair Display) only at ≥28px**: Home hero number, page `<h1>`, big stat displays,
  verdict banners. Never below 28px, never for body.
- **Sans (Inter) for everything else**: nav, buttons, labels, tables, body. Body text `#e2e3e9`
  (bone), 16px, line-height 1.5. Never pure white for long text.
- **Copper is the only chromatic colour** and is reserved for: editorial/AI labels, category
  eyebrows, links, and the "blocked by compliance" outcome state. Never on buttons.
- **Elevation via surface steps + 1px borders**, never drop shadows. Card = onyx on obsidian with a
  `#1c1d22` hairline. (Keep one faint shadow only where a floating panel needs separation, e.g.
  Presenter bar, modal — `--shadow-subtle: rgba(255,255,255,.2) 0 0 0 1px`.)
- **Pills everywhere**: buttons, inputs, tags, status badges all `9999px`. Cards `10px`. Nav
  active-underline `2px`.
- **One primary (white-filled pill) button per viewport.** Everything else is ghost-outline or
  pill-tag.
- **Gilded gradient only on chart lines / data-viz accents.** Nowhere else.

### Outcome language (replaces green/red/amber)

The compliance invariant "green = recovered" becomes "bright = recovered" — same three-way signal,
Slash palette:

| Outcome | Colour | Icon | Meaning |
|---|---|---|---|
| **Recovered** | `#ffffff` paper on a subtle bright wash | `Check` | money is back |
| **Blocked** | `#cc9166` copper | `ShieldCheck` | compliance guard stopped it (this is a *good* stop) |
| **Skipped** | `#777a88` steel/ash | `Minus` | not worth the cost (EV gate) |
| **Pending / neutral** | `#9194a1` fog | `Clock` | scheduled, in-flight |

One legend chip on Home teaches this once. Every page, badge, banner, and Decision Card uses it.

### Fonts loading
`<link>` Google Fonts in `index.html` for Playfair Display (400, 500) + Inter (300, 400, 500, 600,
700). Keep `font-display: swap`. System-serif fallback stack so a font-load failure degrades
gracefully (offline demo must survive — `DEMO_MODE` guarantee).

## Information Architecture

### Nav (sidebar) — after

```
Home                       ← NEW simple landing (the reframed Overview)

ADVANCED
  Recovery
    Live Queue             (Queue + Downtime folded in as a section on the page)
    Recovery Funnel
  Analysis
    Decline Analytics      (Decline Analytics + Model Health folded in as a section)
    Policy Comparison
  Money
    Economics
  Audit
    Audit Trail            (Audit Trail + Claude Insights folded in as a section)
Simulator                  (always visible, own group — the demo entry point)
```

Payment drill-down (`/payment/:id`) stays a route, reached by clicking any payment ID — not in nav.

### Merges (light — fold thin pages into a sibling as a labelled section, keep data-fetching intact)

| Folded page | Into | How |
|---|---|---|
| **Downtime Board** | Live Queue | A "Bank outages" section below the pending-retries table. Same `api.downtime()` query. |
| **Model Health** | Decline Analytics | A "Model health" section below the charts. Same `api.modelHealth()` query. |
| **Claude Insights** | Audit Trail | An "AI insights" section above the decision log. Same `api.insights()` query. |

Kept standalone: Home, Live Queue, Recovery Funnel, Decline Analytics, Policy Comparison, Economics,
Audit Trail, Simulator, Payment detail = **9 destinations** (down from 13 routes / 12 nav items).

Routes for `/downtime`, `/model-health`, `/insights` are removed from nav but **kept as redirects**
to their new host page + anchor, so any bookmarked/demo-scripted deep link still works.

### Home page (reframed Overview)

Layout, top to bottom:
1. **Hero band** — obsidian, generous padding.
   - Eyebrow (copper, 13px): `COMPLIANCE-BOUNDED RECOVERY AGENT`
   - One big serif number (Playfair, 64–88px) with a **before/after toggle**:
     - *With agent* → `₹X recovered` · *Without agent* → `₹Y recovered` (from `/backtest` control vs
       ours; falls back to `/dashboard/stats` `revenue_recovered_inr` if backtest unavailable).
   - One plain auto-generated sentence (Inter 20px, fog): *"This week the agent recovered ₹X from Y
     failed payments and blocked Z retries that card-network rules forbid."* Numbers from
     `stats` + `fineAvoidance`.
   - Primary pill button: **Run a live demo** → `/simulator`. Ghost button: **See the details** →
     `/advanced` (first Advanced page).
2. **Animated pipeline strip** — 6 nodes: Failed → Classified → Scheduled → Retried → Nudged →
   Recovered. On each SSE event the matching node pulses (Framer Motion) and a copper dot travels the
   connector. Under each node: a small count. Uses the existing `useSseFeed`.
3. **4 KPI cards** (count-up animated): Revenue recovered · Recovery rate (with `45.5% baseline`
   sub) · Fines avoided · Payments handled (soft/hard split). Outcome-coloured left rail.
4. **Live activity feed** — the existing SSE list, restyled. Each row uses the outcome badge +
   copper `pay_...` link + relative time.
5. **Outcome legend chip** — small, bottom: `● Recovered  ● Blocked (compliance)  ● Skipped (cost)`.

Empty state (no data yet): the pipeline strip renders greyed, KPIs show `—`, and a centered card:
*"Nothing has run yet. Press **Run a live demo** to see the agent handle a real payment."* + button.

## Wow-factor Components

### 1. Presenter Mode  (biggest demo de-risk)
- Toggle: press `P`, or a small "Presenter" pill in the top bar.
- Renders a slim fixed bar at the bottom (carbon surface, `--shadow-subtle`, pill buttons):
  `Temporary fail` · `Permanent fail` · `Too small to chase` · `Bank outage` · `Reset`.
- Each button: fires `api.simulate({scenario, count: 3, advance_hours: 6})`, then **auto-navigates**
  to the page that best shows the result (`soft`→Home, `hard`→Funnel, `ev_negative`→Funnel,
  `downtime`→Live Queue), then shows the **verdict banner** (below).
- `Esc` or clicking Presenter again hides the bar. State in `localStorage` so it survives reload
  mid-demo.
- Reduced-motion: skip the auto-scroll animation, jump directly.

### 2. Verdict Banner
- Full-width band that slides in under the page header after a simulator/presenter run, auto-dismiss
  after ~8s or on click.
- Three variants, outcome-coloured, serif headline:
  - Recovered — `RECOVERED — ₹4,200 back in 2 retries`
  - Blocked — `BLOCKED — permanent failure; a retry would cost a ₹8.30 network fine`
  - Skipped — `SKIPPED — ₹0.01 payment isn't worth ₹1.50 to chase`
- Text is built from the `SimulateResult` (`created`, `events_emitted`) + a lookup of the scenario's
  expected outcome. If the result is ambiguous, fall back to the scenario's canned expectation
  string already in `SCENARIOS`.

### 3. Decision Card  (the positioning, made visual)
- A component showing the agent's reasoning as four checks:
  ```
  pay_abc123   ₹4,200   Low balance
  ────────────────────────────────
  Allowed to retry?     yes — soft decline
  Whose fault?          customer — funds issue (fundable)
  Better rail?          UPI Autopay  (card likely to fail again)
  Worth the cost?       yes — ₹4,200 vs ₹1.50 nudge
  ────────────────────────────────
  Decision: retry via UPI in 18h        confidence 71%
  ```
- Data sources, all already available on `PaymentDetail` (`api.payment(id)`):
  - *Allowed* ← `event.classification` (`soft`/`hard`) + presence of a `hard_*` audit row.
  - *Fault* ← `event.classify_reason` / `error_reason` mapped to a short phrase
    (fundable / issuer / customer-action / permanent).
  - *Better rail* ← `event.chosen_rail`; show the switch if `chosen_rail !== method`.
  - *Worth the cost* ← amount vs nudge cost; if an `skipped_uneconomic` audit row exists, show the
    negative verdict.
  - *Decision line* ← `retry_at` + `confidence` (already on the pending-retry shape) or the terminal
    audit action.
- Rendered: as the top block of `PaymentDetail`, and inside a modal openable from any `pay_...`
  link (small "view decision" affordance). Modal reuses the same component.
- If a field can't be derived, render it as `—` with a muted note; never fabricate a reason
  (invariant: no fabricated precision).

### 4. Count-up numbers
- Small wrapper (`<Stat value={n} />`) using `react-countup` (or a 20-line Framer Motion
  `useMotionValue` tween — decide at implementation, prefer no dep if trivial). Runs on mount and on
  value change. Respects `prefers-reduced-motion` (shows final value immediately).
- Applied to: Home hero number, all KPI card values, Economics ROI projector outputs.

### 5. Before/After toggle
- A pill segmented control (`Without agent` / `With agent`) on the Home hero and on the Policy page.
- Swaps the displayed number set between control (`45.5%`, control revenue) and ours (`61.1%`, agent
  revenue) from `/backtest`. Animated number transition via the count-up wrapper.
- Honesty note stays visible: a one-line `DisclaimerNote` — *"Synthetic backtest, circular
  validation. Real-world aggregate ML recovery is 22–40%."*

### 6. Consistent outcome colour language
- One `outcome.ts` map: `{ recovered, blocked, skipped, pending } → { color, icon, label }`.
- `badges.tsx` `ACTION_STYLE` re-pointed at these four buckets (every existing action id maps to one
  bucket). Removes the current 6-colour spread.

### 7. Branding
- Sidebar: a small mark + `Recovery Agent` wordmark (Playfair). Favicon (already flagged as a P8
  task). Polished `<title>`.
- Top bar: product name left, `Presenter` + `Reset demo` + date-range on the right.

## Operator Quality-of-Life

| Feature | Implementation |
|---|---|
| **CSV export** | `exportCsv(rows, filename)` util (client-side, ~15 lines: join headers + rows, `Blob`, `URL.createObjectURL`, `<a download>`). "Export CSV" ghost button on: Audit Trail (current filtered page — note: page only, with a tooltip saying so), Live Queue, Policy table, Decline Analytics table. |
| **Top-bar Reset** | Move the existing `api.simulateReset()` call to a top-bar pill (`Reset demo`), with a 1-line confirm (`window.confirm`) so a stray click during a demo doesn't wipe state. Keep the Simulator's own button too. |
| **Copy payment ID** | `<CopyId id={pid} />` — renders the truncated mono id + a tiny copy icon; `navigator.clipboard.writeText`, 1.5s "copied" tick. Replaces the bare `pay_...` spans everywhere. |
| **Guided empty states** | Extend the existing `EmptyState` to take an optional action. Every page's empty view: one sentence + **Run the simulator** button (navigates to `/simulator`). No more dead pages. |
| **Keyboard shortcuts** | Global `useHotkeys`-style listener (hand-rolled `keydown`, ~20 lines): `d` = go to Simulator + run last scenario, `r` = reset (with confirm), `p` = toggle Presenter Mode, `?` = show a shortcuts overlay, `Esc` = close overlay/Presenter. Ignored when focus is in an input. Shown in the `?` overlay. |
| **Global date range** | A pill date-range control in the top bar (two `<input type="date">`, native, styled as pills). Stores `{from, to}` in a React context. `api.stats` already takes `from_date`/`to_date`; wire the context through the `qk.stats` key + query fn on every page that calls `stats`. Pages whose endpoints don't support dates (funnel, downtime, model-health) show the control disabled with a tooltip: *"This view isn't date-filtered."* Default range: last 30 days. A "Clear" resets to all-time. |

## Architecture / Components

New/changed files (no new directories):

```
frontend/src/
  index.css                      ← new @theme tokens, font imports
  index.html                     ← Google Fonts <link>, <title>, favicon
  lib/
    outcome.ts                   ← NEW: outcome → {color,icon,label}
    exportCsv.ts                 ← NEW: client CSV
    useHotkeys.ts                ← NEW: global keydown listener
    dateRange.tsx                ← NEW: React context + provider + hook
  components/common/
    primitives.tsx               ← restyle (tokens), add SegmentedToggle
    KpiCard.tsx                  ← restyle, count-up value, outcome rail
    badges.tsx                   ← ACTION_STYLE → 4 outcome buckets
    states.tsx                   ← EmptyState gains an action prop
    Stat.tsx                     ← NEW: count-up number wrapper
    CopyId.tsx                   ← NEW
    VerdictBanner.tsx            ← NEW
    DecisionCard.tsx             ← NEW
    PipelineStrip.tsx            ← NEW (Home)
    PresenterBar.tsx             ← NEW
    Modal.tsx                    ← NEW (thin; for DecisionCard)
  app/
    App.tsx / AppLayout          ← top bar (Presenter, Reset, DateRange), sidebar brand
    router.tsx                   ← nav reorg, merged pages, redirects
  pages/
    Home.tsx                     ← NEW (reframed Overview)
    Overview.tsx                 ← DELETED (content moves to Home)
    Queue.tsx                    ← + Downtime section, CSV, CopyId
    Analytics.tsx                ← + ModelHealth section, CSV
    Audit.tsx                    ← + Insights section, CSV
    Downtime.tsx / ModelHealth.tsx / Insights.tsx  ← DELETED (folded)
    Policy.tsx                   ← before/after toggle, CSV
    Economics.tsx               ← count-up on projector
    PaymentDetail.tsx           ← DecisionCard as top block
    Funnel.tsx                   ← restyle, outcome colours on guards
    Simulator.tsx               ← VerdictBanner on result, restyle
```

### Data flow (unchanged in shape)
- TanStack Query per page, same `qk.*` keys, same `api.*` functions.
- Date range adds one input to `qk.stats(rangeKey)` and the `stats` query fn args. Nothing else in
  the query layer changes.
- SSE: `useSseFeed` unchanged; PipelineStrip and Home activity feed both consume it.
- Presenter/Verdict/Modal state is local component state + `localStorage` for the Presenter toggle.

### Error handling
- Font load failure → serif fallback stack (no functional impact).
- `clipboard.writeText` rejection (insecure context) → fall back to a hidden `<textarea>` +
  `document.execCommand('copy')`; if that fails, select the text and show "press Ctrl+C".
- CSV on a large audit page → it's the current page only (≤30 rows), no perf concern.
- `/backtest` unavailable → before/after toggle disables the "Without agent" side, shows the note.
- Decision Card missing fields → `—` + muted note, never invented.
- Presenter run while a previous run's queries are in flight → buttons disabled during `isPending`.

### Testing
- **Vitest unit:**
  - `outcome.ts` — every known audit action id maps to exactly one bucket.
  - `exportCsv.ts` — headers + rows + escaping of commas/quotes/newlines in a cell.
  - `Stat` — renders final value immediately under `prefers-reduced-motion`.
  - `DecisionCard` — given a payment fixture with `chosen_rail !== method`, shows the rail switch;
    given an `skipped_uneconomic` audit row, shows the negative "worth the cost" verdict; given a
    missing `classify_reason`, shows `—` not a fabricated string.
- **Playwright e2e (extend `shell.spec.ts`):**
  - Home renders hero number, pipeline strip, 4 KPIs, legend.
  - Nav has 9 destinations; `/downtime` redirects to Live Queue and the "Bank outages" section is
    present.
  - Presenter Mode: press `p` → bar appears; click `Permanent fail` → URL becomes `/funnel` and a
    verdict banner with "BLOCKED" is visible.
  - "Export CSV" on Audit triggers a download (assert the `download` attribute / response).
  - Copy-ID click shows the "copied" tick.
  - Existing tests (shell nav, all routes, deep-link fallback, tooltip) still green.
- **Backend:** unchanged — 108 pytest stays green (no server code touched). Run it once at the end
  of each phase as a regression guard.
- Offline `DEMO_MODE` walkthrough re-verified at the end of each phase.

## Phasing

Sequenced so each phase is independently shippable and lower-risk than the next. If time runs out,
freeze after any completed phase.

### Phase 1 — Visual restyle (no structural change)
Swap `index.css` tokens, load fonts, restyle `primitives.tsx` / `KpiCard.tsx` / `badges.tsx` /
`states.tsx`, apply Slash classes across all 12 existing pages, introduce `outcome.ts` and the
4-bucket colour language, add branding (sidebar wordmark, favicon, title). No page moves, no new
features. **Exit:** every existing page renders in the new style, all e2e + unit green, offline demo
works.

### Phase 2 — Simpler IA
Create `Home.tsx` (reframed Overview + pipeline strip + before/after toggle + legend), delete
`Overview.tsx`. Fold Downtime → Queue, ModelHealth → Analytics, Insights → Audit. Reorg
`router.tsx` nav to 9 destinations + add redirects. **Exit:** nav shows Home + Advanced + Simulator,
folded sections present and fetching, redirects work, tests green.

### Phase 3 — Wow + QoL
PresenterBar, VerdictBanner, DecisionCard + Modal, count-up `Stat` wrapper applied, CSV export
buttons, top-bar Reset, CopyId everywhere, guided empty states, keyboard shortcuts + `?` overlay,
global date-range context wired through `stats` pages. **Exit:** Presenter Mode drives the full
5-scenario demo hands-free, all QoL features work, full test suite green, offline demo re-verified,
`docs/what-broke.md` updated with anything discovered.

## Risks

| Risk | Mitigation |
|---|---|
| Restyle touches every file, bugs land near freeze | Phase 1 is mechanical (class/token swaps); e2e suite + offline demo run at phase exit; phases are ordered so a freeze after P1 still yields a coherent product. |
| Playfair Display fails to load offline | System-serif fallback stack; `DEMO_MODE` invariant already forbids network dependence — fonts are `swap` and non-blocking. |
| Presenter Mode auto-nav fights React Router timing | Navigate first, then fire the mutation, then show the banner on the destination page via a small shared "last verdict" context; disable buttons during `isPending`. |
| Date-range wiring balloons (many pages call `stats`) | Only `stats`-backed views get it; others show a disabled control with a tooltip. One context, one query-key input. |
| Decision Card invents reasoning the backend didn't produce | Every field maps to a concrete `event`/`audit` value or renders `—`; unit test asserts the `—` path. |
| Scope too large for 8 days | Three independent phases; explicit "freeze after any phase" rule; wow features (P3) are the cut line, not the restyle. |

## Open Questions

None blocking. Implementation-time decisions flagged inline: `react-countup` vs hand-rolled tween;
exact redirect vs. keep-old-route-as-thin-page.
