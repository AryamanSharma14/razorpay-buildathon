import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clapperboard, RotateCcw } from 'lucide-react'
import { api } from '../lib/api'
import { ago } from '../lib/format'
import { useSseFeed } from '../lib/useSse'
import { Card, CardTitle, PageHeader, Button } from '../components/common/primitives'
import { AuditActionBadge } from '../components/common/badges'
import { cn } from '../lib/utils'
import type { ScenarioId, SimulateResult } from '../lib/types'

const SCENARIOS: { id: ScenarioId; label: string; desc: string; expects: string }[] = [
  { id: 'soft', label: 'Temporary failure', desc: 'Card fails for low balance. The agent schedules a retry at a smart time.', expects: 'retry scheduled → payment link → customer reminded' },
  { id: 'hard', label: 'Permanent failure', desc: 'Expired card. The agent refuses to retry it — even a manual retry gets blocked.', expects: 'stopped: cannot succeed' },
  { id: 'downtime', label: 'Bank outage', desc: 'A bank goes down. Failures are parked, then retried once the bank is back.', expects: 'parked until bank recovers → retrying parked payments' },
  { id: 'card_testing', label: 'Fraud-pattern burst', desc: 'Rapid repeats on one card look like card-testing fraud. The spacing guard stops it.', expects: 'blocked: fraud-pattern spacing' },
  { id: 'trajectory', label: 'Escalating failures', desc: 'Same order keeps failing with worsening reasons. The agent concludes it will never succeed.', expects: 'blocked: too many failed attempts' },
  { id: 'ev_negative', label: 'Too small to chase', desc: 'A ₹0.01 payment — retrying it costs more than the amount itself.', expects: 'skipped: costs more than it returns' },
  { id: 'payday', label: 'Payday timing', desc: 'Government salary day — retries move to when accounts actually have money.', expects: 'moved to payday' },
]

export default function Simulator() {
  const qc = useQueryClient()
  const [scenario, setScenario] = useState<ScenarioId>('soft')
  const [count, setCount] = useState(3)
  const [advance, setAdvance] = useState(true)
  const [result, setResult] = useState<SimulateResult | null>(null)
  const { events, connected } = useSseFeed(40)

  const invalidateAll = () => qc.invalidateQueries()
  const sim = useMutation({
    mutationFn: () => api.simulate({ scenario, count, advance_hours: advance ? 6 : 0 }),
    onSuccess: (r) => { setResult(r); invalidateAll() },
  })
  const reset = useMutation({
    mutationFn: () => api.simulateReset(),
    onSuccess: () => { setResult(null); invalidateAll() },
  })

  return (
    <>
      <PageHeader
        title="Simulator"
        sub="Press a button, watch the agent handle a real scenario end-to-end. Every safety rule applies — nothing is faked."
        action={
          <Button variant="danger" onClick={() => reset.mutate()} disabled={reset.isPending}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <CardTitle>Pick a scenario</CardTitle>
            <div className="grid gap-2 md:grid-cols-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScenario(s.id)}
                  className={cn(
                    'rounded-md border p-3 text-left transition-colors',
                    scenario === s.id
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-bg-subtle hover:bg-surface-hover',
                  )}
                >
                  <div className="text-[13px] font-semibold">{s.label}</div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-text-muted">{s.desc}</p>
                  <p className="mt-1 font-mono text-[10px] text-text-faint">expect: {s.expects}</p>
                </button>
              ))}
            </div>


            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
              <label className="flex items-center gap-2 text-[13px] text-text-muted">
                Payments
                <input type="number" min={1} max={10} value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(10, Number(e.target.value))))}
                  className="w-16 rounded-xs border border-border bg-bg-subtle px-2 py-1 font-mono text-[12px] outline-none focus:border-accent" />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text-muted">
                <input type="checkbox" checked={advance} onChange={(e) => setAdvance(e.target.checked)}
                  className="accent-copper" />
                Skip the wait: fire scheduled retries immediately
              </label>
              <div className="ml-auto">
                <Button variant="primary" onClick={() => sim.mutate()} disabled={sim.isPending}>
                  <Clapperboard className="h-3.5 w-3.5" />
                  {sim.isPending ? 'Running…' : `Run ${scenario}`}
                </Button>
              </div>
            </div>

            {sim.isError && (
              <p className="mt-3 text-[13px] text-neg">{String((sim.error as Error)?.message ?? sim.error)}</p>
            )}

            {result && (
              <div className="mt-4 rounded-md border border-pos/30 bg-pos/5 p-3">
                <p className="text-[13px]">
                  <span className="font-semibold text-pos">✓ {result.created.length} payments created</span>
                  <span className="text-text-muted"> · {result.events_emitted} pipeline events emitted</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.created.map((pid) => (
                    <Link key={pid} to={`/payment/${pid}`}
                      className="rounded-xs bg-surface-hover px-2 py-0.5 font-mono text-[11px] text-accent hover:underline">
                      {pid}
                    </Link>
                  ))}
                </div>
                <p className="mt-2 text-[12px] text-text-faint">
                  Now check the Overview, Funnel and Audit Trail — or drill into a payment above.
                </p>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardTitle
            action={
              <span className="flex items-center gap-1.5 text-[11px] text-text-faint">
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-pos' : 'bg-neg'}`} />
                {connected ? 'live' : 'offline'}
              </span>
            }
          >
            Live pipeline events
          </CardTitle>
          <div className="max-h-[30rem] space-y-1.5 overflow-y-auto">
            {events.length === 0 && (
              <p className="py-8 text-center text-[13px] text-text-muted">Run a scenario to see the stream.</p>
            )}
            {[...events].reverse().map((ev, i) => (
              <div key={`${ev.ts}-${i}`} className="rounded-xs bg-bg-subtle px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <AuditActionBadge action={ev.type} />
                  <span className="text-[10px] text-text-faint">{ago(ev.ts)}</span>
                </div>
                <Link to={`/payment/${ev.payment_id}`}
                  className="mt-0.5 block truncate font-mono text-[11px] text-text-muted hover:text-accent">
                  {ev.payment_id}
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
