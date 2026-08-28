import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { Card, CardTitle, PageHeader } from '../components/common/primitives'
import { QueryBoundary } from '../components/common/states'
import { DisclaimerNote } from '../components/common/badges'
import type { Funnel } from '../lib/types'
import { cn } from '../lib/utils'

const STAGES: { key: keyof Funnel; label: string; tone: string }[] = [
  { key: 'total_failed', label: 'Failed payments', tone: 'bg-border-strong' },
  { key: 'classified_soft', label: 'Classified soft (retryable)', tone: 'bg-info' },
  { key: 'scheduled', label: 'Retry scheduled (ML-timed)', tone: 'bg-warn' },
  { key: 'fired', label: 'Recovery fired', tone: 'bg-accent' },
  { key: 'nudged', label: 'Customer nudged', tone: 'bg-ai' },
  { key: 'recovered', label: 'Recovered', tone: 'bg-pos' },
]

const GUARDS: { key: keyof Funnel; label: string; hint: string }[] = [
  { key: 'classified_hard', label: 'Hard declines (never retried)', hint: 'Visa Cat-1 guard' },
  { key: 'compliance_blocked', label: 'Network cap / card-testing blocks', hint: 'Visa 20/30d · MC 10/24h · 24h spacing' },
  { key: 'ev_skipped', label: 'Skipped uneconomic (EV < 0)', hint: 'recovery cost > expected value' },
  { key: 'trajectory_blocked', label: 'Trajectory escalation stops', hint: 'soft→hard pattern detected' },
  { key: 'maintenance_snapped', label: 'Maintenance-window snaps', hint: 'moved out of bank maintenance' },
]

export default function FunnelPage() {
  const funnel = useQuery({ queryKey: qk.funnel(), queryFn: () => api.funnel() })

  return (
    <>
      <PageHeader title="Recovery Funnel" sub="Where every failed payment goes — and where the guards stop it" />
      <QueryBoundary query={funnel} skeletonRows={6}>
        {(f) => {
          const base = Math.max(f.total_failed, 1)
          return (
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardTitle>Pipeline</CardTitle>
                <div className="space-y-3">
                  {STAGES.map((s) => {
                    const v = f[s.key]
                    return (
                      <div key={s.key}>
                        <div className="mb-1 flex items-baseline justify-between text-[13px]">
                          <span className="text-text-muted">{s.label}</span>
                          <span className="font-mono tabular-nums">{v}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-sm bg-bg-subtle">
                          <div className={cn('h-full rounded-sm', s.tone)}
                            style={{ width: `${Math.max((v / base) * 100, v > 0 ? 2 : 0)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card className="lg:col-span-2">
                <CardTitle>Guard interventions</CardTitle>
                <div className="space-y-2.5">
                  {GUARDS.map((g) => (
                    <div key={g.key} className="rounded-sm bg-bg-subtle px-3 py-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[13px]">{g.label}</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-neg">{f[g.key]}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-text-faint">{g.hint}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <DisclaimerNote>
                    Every guard writes an audit row — each number above is traceable to individual payments
                    in the Audit Trail.
                  </DisclaimerNote>
                </div>
              </Card>
            </div>
          )
        }}
      </QueryBoundary>
    </>
  )
}
