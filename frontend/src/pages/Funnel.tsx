import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { Card, CardTitle, PageHeader } from '../components/common/primitives'
import { QueryBoundary } from '../components/common/states'
import { DisclaimerNote } from '../components/common/badges'
import type { Funnel } from '../lib/types'
import { cn } from '../lib/utils'

const STAGES: { key: keyof Funnel; label: string; desc: string; tone: string }[] = [
  { key: 'total_failed', label: 'Failed payments', desc: 'every failed payment handed to the AI recovery agent', tone: 'bg-border-strong' },
  { key: 'classified_soft', label: 'Temporary failures', desc: 'low balance, OTP timeout, bank server glitch — worth retrying', tone: 'bg-info' },
  { key: 'scheduled', label: 'Retry scheduled', desc: 'the ML model scanned the next 10 days and picked the hour with the highest chance of success', tone: 'bg-warn' },
  { key: 'fired', label: 'Retry attempted', desc: 'a Razorpay payment link was created and sent to the customer', tone: 'bg-accent' },
  { key: 'nudged', label: 'Customer reminded', desc: 'a WhatsApp or SMS reminder was delivered to the customer', tone: 'bg-ai' },
  { key: 'recovered', label: 'Payment recovered', desc: 'customer paid via UPI/Card — money is back in the merchant’s account', tone: 'bg-pos' },
]

const GUARDS: { key: keyof Funnel; label: string; hint: string }[] = [
  { key: 'classified_hard', label: 'Permanent failures — never retried', hint: 'expired card, stolen card, closed account. Retrying these earns Visa/Mastercard fines.' },
  { key: 'compliance_blocked', label: 'Stopped by card network rules', hint: 'monthly retry limits reached (20/mo), or rapid retries blocked by anti-fraud rules.' },
  { key: 'ev_skipped', label: 'Skipped: reminder costs more than payment', hint: 'retrying a ₹0.01 payment with a ₹0.35 WhatsApp reminder would lose money.' },
  { key: 'trajectory_blocked', label: 'Stopped after repeated worsening failures', hint: 'declines are getting progressively worse with each retry.' },
  { key: 'maintenance_snapped', label: 'Moved past bank maintenance', hint: 'Indian banks run maintenance around midnight — retries automatically moved to morning.' },
]

export default function FunnelPage() {
  const funnel = useQuery({ queryKey: qk.funnel(), queryFn: () => api.funnel() })

  return (
    <>
      <PageHeader
        title="Recovery Funnel"
        sub="Follow every failed payment from decline to recovery — and see exactly where the safety rules protect the merchant."
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
                          <span className="text-text font-medium">{s.label}</span>
                          <span className="font-mono tabular-nums text-paper">{v}</span>
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
                <CardTitle>Where the safety rules step in</CardTitle>
                <div className="space-y-2.5">
                  {GUARDS.map((g) => (
                    <div key={g.key} className="rounded-xs bg-bg-subtle px-3 py-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[13px] font-medium text-bone">{g.label}</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-neg">{f[g.key]}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-text-faint">{g.hint}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <DisclaimerNote>
                    Every safety guard writes an immutable audit record — each count above is traceable to specific payments in the Decision Log.
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
