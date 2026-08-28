import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { Card, CardTitle, PageHeader } from '../components/common/primitives'
import { QueryBoundary } from '../components/common/states'
import { DisclaimerNote } from '../components/common/badges'
import type { Funnel } from '../lib/types'
import { cn } from '../lib/utils'

const STAGES: { key: keyof Funnel; label: string; desc: string; tone: string }[] = [
  { key: 'total_failed', label: 'Failed payments', desc: 'every failure handed to the recovery agent', tone: 'bg-border-strong' },
  { key: 'classified_soft', label: 'Temporary failures', desc: 'low balance, OTP timeout, bank glitch — worth retrying', tone: 'bg-info' },
  { key: 'scheduled', label: 'Retry scheduled', desc: 'the model picks the moment a retry is most likely to work', tone: 'bg-warn' },
  { key: 'fired', label: 'Retry attempted', desc: 'a payment link was created and sent to the customer', tone: 'bg-accent' },
  { key: 'nudged', label: 'Customer reminded', desc: 'a gentle nudge was sent to complete payment', tone: 'bg-ai' },
  { key: 'recovered', label: 'Payment recovered', desc: 'money is back in the merchant’s account', tone: 'bg-pos' },
]

const GUARDS: { key: keyof Funnel; label: string; hint: string }[] = [
  { key: 'classified_hard', label: 'Permanent failures — never retried', hint: 'expired card, closed account. Retrying these earns fines, not money.' },
  { key: 'compliance_blocked', label: 'Stopped by network rules', hint: 'Visa/Mastercard retry limits reached, or the pattern looks like card testing.' },
  { key: 'ev_skipped', label: 'Skipped: not worth the cost', hint: 'retrying would cost more than the money it would likely bring back.' },
  { key: 'trajectory_blocked', label: 'Stopped after repeated failures', hint: 'the failure pattern shows this payment will never succeed.' },
  { key: 'maintenance_snapped', label: 'Moved past bank maintenance', hint: 'banks run maintenance at night — retries moved to after it ends.' },
]

export default function FunnelPage() {
  const funnel = useQuery({ queryKey: qk.funnel(), queryFn: () => api.funnel() })

  return (
    <>
      <PageHeader
        title="Recovery Funnel"
        sub="Follow every failed payment from failure to recovery — and see exactly where the safety guards step in."
      />
      <QueryBoundary query={funnel} skeletonRows={6}>
        {(f) => {
          const base = Math.max(f.total_failed, 1)
          return (
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardTitle>The journey of a failed payment</CardTitle>
                <div className="space-y-3">
                  {STAGES.map((s) => {
                    const v = f[s.key]
                    return (
                      <div key={s.key}>
                        <div className="mb-0.5 flex items-baseline justify-between text-[13px]">
                          <span className="text-text">{s.label}</span>
                          <span className="font-mono tabular-nums">{v}</span>
                        </div>
                        <p className="mb-1 text-[11px] text-text-faint">{s.desc}</p>
                        <div className="h-3 overflow-hidden rounded-xs bg-bg-subtle">
                          <div className={cn('h-full rounded-xs', s.tone)}
                            style={{ width: `${Math.max((v / base) * 100, v > 0 ? 2 : 0)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card className="lg:col-span-2">
                <CardTitle>Where the safety guards step in</CardTitle>
                <div className="space-y-2.5">
                  {GUARDS.map((g) => (
                    <div key={g.key} className="rounded-xs bg-bg-subtle px-3 py-2">
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
