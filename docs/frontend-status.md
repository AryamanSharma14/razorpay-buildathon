# Frontend Status — Live Dashboard Build

> Living status doc. Last updated: 2026-08-28, ~13:30 IST.

## Where we are right now

**The dashboard is real.** All 12 routes render live data from the FastAPI backend — no
placeholders remain. The production build is committed at `src/web/dist/` and served by
FastAPI itself (`GET /` → SPA with client-side routing fallback), so the demo is one process:
`python -m uvicorn src.main:app --port 8000` → http://localhost:8000/.

**Everything is green:**

| Check | Result |
|---|---|
| Backend test suite | 108 passed |
| Frontend typecheck + build (`tsc -b && vite build`) | clean, emits to `src/web/dist/` |
| Frontend unit tests (vitest) | 1 passed |
| Lint (oxlint) | 0 errors (3 pre-existing warnings in scaffold files) |
| Playwright e2e (3 specs, real server on :8123) | 3 passed — every route mounts with zero console errors |
| `scripts/demo.py --reset` end-to-end | completed: 6 soft → 10 scheduled → 1 recovered, ₹499 recovered, ₹8.30 fines avoided |
| `GET /` serves the built SPA | title "Recovery Agent — Razorpay", hashed assets resolve |

## What was built (this session)

Twelve pages over the existing scaffold (router, sidebar, TanStack Query, primitives were already in place):

**Recovery** — `Overview` (KPIs + hard-decline list + rail split + SSE live feed),
`Queue` (pending retries with force-fire/cancel mutations), `PaymentDetail`
(event fields, decline history, per-payment audit trail).

**Analysis** — `Analytics` (recharts: declines by reason, rail split, issuer-health table),
`Funnel` (pipeline bars + guard-intervention counters), `Policy` (backtest replay table,
aggressive-vs-ours fines KPIs).

**Ops** — `Downtime` (active outages + parked queue, 5s refetch), `ModelHealth`
(status/confidence/fallback KPIs + feature-importance bars), `Audit` (paginated,
filterable by action + payment_id), `Economics` (nudge spend, fine-avoidance breakdown,
interactive ROI projector), `Insights` (Claude aggregate-only findings), `Simulator`
(7 scenario cards → real webhook pipeline, time-travel toggle, SSE event stream).

Supporting pieces: `src/lib/useSse.ts` (EventSource hook for `/events/stream`).

## What broke while doing it (fixed)

1. **Vite emitted to `frontend/dist` instead of `src/web/dist`** — the committed build FastAPI
   serves was stale. Fixed `outDir: '../src/web/dist'` + `emptyOutDir` in `vite.config.ts`.
   See `what-broke.md` #11.
2. **Playwright `webServer.command` used a relative `../.venv/...` path** — Windows cmd cannot
   resolve relative exe paths ("'..' is not recognized"). Fixed with an absolute, quoted path
   computed from `import.meta.url` in `playwright.config.ts`. See `what-broke.md` #12.

## How to run it

```powershell
# backend + dashboard (one process)
python -m uvicorn src.main:app --port 8000     # → http://localhost:8000/

# seed demo data (optional, ~2 min)
python scripts/demo.py --reset

# rebuild the frontend after edits
cd frontend; npm run build                      # emits to src/web/dist/

# frontend checks
cd frontend; npm test; npx playwright test
```

## What's left / known gaps

- Bundle is one 1.4 MB chunk (recharts is heavy). Fine for a demo; code-split if it ever matters.
- `Simulator` time-travel advances 6h; some scheduled retries may still sit in the future —
  the Queue page shows them either way.
- No auth (demo-grade, single-user). Deliberate.
