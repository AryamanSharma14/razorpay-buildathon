import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clapperboard, RotateCcw, Sparkles, CheckCircle2, ShieldAlert, AlertTriangle, Zap, Activity } from 'lucide-react'
import { api } from '../lib/api'
import { ago } from '../lib/format'
import { useSseFeed } from '../lib/useSse'
import { Card, CardTitle, PageHeader, Button } from '../components/common/primitives'
import { AuditActionBadge } from '../components/common/badges'
import { CopyId } from '../components/common/CopyId'
import { useVerdict } from '../components/common/VerdictBanner'
import { GlowBackdrop } from '../components/reactbits/GlowBackdrop'
import { LiveBeacon } from '../components/reactbits/LiveBeacon'
import { sound } from '../lib/sound'
import { cn } from '../lib/utils'
import type { ScenarioId, SimulateResult } from '../lib/types'

const SCENARIOS: { id: ScenarioId; label: string; desc: string; expects: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    id: 'soft',
    label: 'Temporary Failure (Low Balance)',
    desc: 'Customer card reports insufficient funds. Watch the ML model wait for payday, switch to WhatsApp UPI, and successfully collect ₹1,499.',
    expects: 'ML snaps to salary day → WhatsApp UPI link sent → recovered',
    icon: Sparkles,
  },
  {
    id: 'hard',
    label: 'Permanent Failure (Expired Card)',
    desc: 'An expired card that will never work. The agent blocks retries immediately with 0 attempts, avoiding a ₹8.30 Visa Category-1 fine.',
    expects: 'Immediately blocked with 0 attempts (Visa safety compliance rule)',
    icon: ShieldAlert,
  },
  {
    id: 'downtime',
    label: 'Bank Outage & Downtime Hold',
    desc: 'An issuing bank goes offline. The agent safely parks all payments, then auto-drains and retries the moment gateway health restores.',
    expects: 'Parked safely during outage → auto-drained & retried on recovery',
    icon: AlertTriangle,
  },
  {
    id: 'card_testing',
    label: 'Fraud-Pattern Rapid Burst',
    desc: 'The same card attempts checkout multiple times in seconds. The agent enforces anti-fraud 24h spacing to prevent card testing flags.',
    expects: 'Blocked: anti-fraud 24h spacing rule enforced',
    icon: ShieldAlert,
  },
  {
    id: 'trajectory',
    label: 'Escalating Failure Chain',
    desc: 'A payment fails with worsening error codes across attempts. The agent proactively halts retries rather than spamming the customer.',
    expects: 'Blocked: escalating failure trajectory halted',
    icon: Activity,
  },
  {
    id: 'ev_negative',
    label: 'Micro-Charge (Negative EV)',
    desc: 'A ₹0.01 micro-payment. WhatsApp reminder costs ₹0.35. The agent skips recovery because sending a reminder would lose money.',
    expects: 'Skipped: recovery cost exceeds payment value',
    icon: Zap,
  },
  {
    id: 'payday',
    label: 'PSU Govt Payday Alignment',
    desc: 'Government & PSU bank cardholders receive salary on the 7th. The agent snaps retries specifically to the 7th salary credit window.',
    expects: 'Rescheduled to PSU salary credit date (7th of month)',
    icon: Sparkles,
  },
]

export default function Simulator() {
  const qc = useQueryClient()
  const { showVerdict } = useVerdict()
  const [scenario, setScenario] = useState<ScenarioId>('soft')
  const [count, setCount] = useState(3)
  const [advance, setAdvance] = useState(true)
  const [result, setResult] = useState<SimulateResult | null>(null)
  const { events, connected } = useSseFeed(40)

  const invalidateAll = () => qc.invalidateQueries()

  const sim = useMutation({
    mutationFn: () => api.simulate({ scenario, count, advance_hours: advance ? 6 : 0 }),
    onSuccess: (r) => {
      setResult(r)
      invalidateAll()
      const isHard = scenario === 'hard'
      const isEv = scenario === 'ev_negative'
      const createdCount = Array.isArray(r?.created) ? r.created.length : 0
      sound.success()
      showVerdict({
        type: isHard ? 'blocked' : isEv ? 'skipped' : 'recovered',
        title: `SIMULATED: ${scenario.toUpperCase()}`,
        detail: `Created ${createdCount} payments and emitted ${r.events_emitted} decision events through the live AI pipeline.`,
      })
    },
  })

  const reset = useMutation({
    mutationFn: () => api.simulateReset(),
    onSuccess: () => {
      setResult(null)
      invalidateAll()
      sound.chime()
      showVerdict({
        type: 'info',
        title: 'DEMO RESET',
        detail: 'All demo payments and audit records have been cleared.',
      })
    },
  })

  return (
    <div className="relative space-y-6 max-w-7xl mx-auto pb-12">
      <GlowBackdrop color="copper" />

      <PageHeader
        title="Live Scenario Simulator"
        sub="Fire realistic failure payloads through the real recovery pipeline. Every scenario triggers real classification, timing, and recovery logic."
        action={
          <Button
            variant="danger"
            onClick={() => {
              sound.click()
              reset.mutate()
            }}
            disabled={reset.isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demo DB</span>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="p-6">
            <CardTitle>
              <div className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4 text-copper" />
                <span>Select Simulation Scenario</span>
              </div>
            </CardTitle>
            <div className="space-y-2.5">
              {SCENARIOS.map((s) => {
                const Icon = s.icon
                const isSelected = scenario === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      sound.click()
                      setScenario(s.id)
                    }}
                    className={cn(
                      'relative cursor-pointer rounded-2xl border p-4 transition-all duration-200 shadow-xs overflow-hidden',
                      isSelected
                        ? 'border-copper/70 bg-carbon text-paper shadow-md scale-[1.005]'
                        : 'border-border/70 bg-surface text-text-muted hover:border-steel hover:text-bone hover:bg-surface-hover'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg',
                          isSelected ? 'bg-copper/20 text-copper' : 'bg-onyx text-text-faint'
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-paper">{s.label}</span>
                      </div>
                      <span className="font-mono text-[10px] text-text-faint uppercase font-bold bg-onyx px-2 py-0.5 rounded-full border border-border/40">{s.id}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-text-muted">{s.desc}</p>
                    <div className="mt-2.5 rounded-lg bg-onyx/80 border border-border/50 px-2.5 py-1.5 text-[11px] text-copper font-medium flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 shrink-0" />
                      <span>Expected: {s.expects}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-text-muted">
                  <span>Count:</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={count}
                    onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                    className="w-16 rounded-xl border border-border bg-onyx px-2.5 py-1 font-mono text-xs text-paper outline-none focus:border-copper"
                  />
                </label>

                <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advance}
                    onChange={(e) => setAdvance(e.target.checked)}
                    className="accent-copper rounded"
                  />
                  <span>Simulate instant clock advance</span>
                </label>
              </div>

              <Button
                variant="primary"
                onClick={() => {
                  sound.click()
                  sim.mutate()
                }}
                disabled={sim.isPending}
              >
                <Clapperboard className="h-3.5 w-3.5" />
                <span>{sim.isPending ? 'Simulating…' : `Simulate ${count} payments`}</span>
              </Button>
            </div>

            {sim.isError && (
              <p className="mt-3 text-xs text-copper font-medium">
                {String((sim.error as Error)?.message ?? sim.error)}
              </p>
            )}

            {result && Array.isArray(result.created) && (
              <div className="mt-4 rounded-xl border border-pos/40 bg-pos/10 p-4 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-pos">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>✓ {result.created.length} payments processed · {result.events_emitted} decision events emitted</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {result.created.map((pid) => (
                    <CopyId
                      key={pid}
                      id={pid}
                      truncate={18}
                      linkTo={`/payment/${pid}`}
                      className="rounded-full bg-onyx px-2.5 py-1 border border-border/80"
                    />
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6">
          <CardTitle
            action={
              <LiveBeacon
                status={connected ? 'active' : 'offline'}
                label={connected ? 'SSE Bus Live' : 'Disconnected'}
                size="sm"
              />
            }
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-copper" />
              <span>Live Decision Event Stream</span>
            </div>
          </CardTitle>
          {events.length === 0 ? (
            <p className="py-16 text-center text-xs text-text-muted">
              No events received yet. Click "Simulate" to run payments through the live AI decision pipeline.
            </p>
          ) : (
            <div className="space-y-2 max-h-[38rem] overflow-y-auto pr-1">
              {[...events].reverse().map((ev, i) => (
                <div
                  key={`${ev.ts}-${i}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-carbon p-3.5 shadow-xs transition-colors hover:border-steel"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <AuditActionBadge action={ev.type} />
                      <CopyId
                        id={ev.payment_id}
                        truncate={16}
                        linkTo={ev.payment_id !== 'system' ? `/payment/${ev.payment_id}` : undefined}
                      />
                    </div>
                    {ev.summary && (
                      <p className="text-xs text-text-muted leading-relaxed font-sans">{ev.summary}</p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-text-faint shrink-0">{ago(ev.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
