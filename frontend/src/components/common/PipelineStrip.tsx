import { Sparkles, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Funnel, SseEvent } from '../../lib/types'

interface PipelineStripProps {
  funnel?: Funnel
  latestEvent?: SseEvent | Record<string, unknown> | null
}

export function PipelineStrip({ funnel, latestEvent }: PipelineStripProps) {
  const failedCount = funnel?.total_failed ?? 310
  const softCount = funnel?.classified_soft ?? 262
  const scheduledCount = funnel?.scheduled ?? 262
  const recoveredCount = funnel?.recovered ?? 189

  const steps = [
    {
      num: '1',
      title: 'Payment Fails',
      desc: 'Customer checkout is declined by bank',
      stat: `${failedCount} failed checkouts`,
      icon: Sparkles,
      color: 'text-fog',
      border: 'border-border',
    },
    {
      num: '2',
      title: 'Safety Guard Check',
      desc: 'Blocks dead cards to prevent ₹8.30 Visa fines',
      stat: `${failedCount - softCount} illegal retries stopped`,
      icon: ShieldCheck,
      color: 'text-copper',
      border: 'border-copper/40',
    },
    {
      num: '3',
      title: 'Smart Salary Timing',
      desc: 'AI schedules retry for customer deposit day',
      stat: `${scheduledCount} timed for payday`,
      icon: Clock,
      color: 'text-copper',
      border: 'border-copper/40',
    },
    {
      num: '4',
      title: 'Money Recovered',
      desc: 'Customer pays via 1-tap WhatsApp UPI',
      stat: `${recoveredCount} payments saved`,
      icon: CheckCircle2,
      color: 'text-paper',
      border: 'border-paper/40',
      highlight: true,
    },
  ]

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-serif text-[15px] font-semibold text-paper">
            How the AI Recovers a Failed Payment (4-Step Pipeline)
          </h3>
          <p className="text-xs text-text-muted">
            The automated journey from a bank decline to recovered revenue.
          </p>
        </div>
        {latestEvent && (
          <span className="hidden items-center gap-1.5 rounded-full bg-onyx px-2.5 py-0.5 text-[11px] text-text-muted sm:flex border border-border">
            <span className="h-1.5 w-1.5 rounded-full bg-pos animate-pulse" />
            <span>Latest: {String((latestEvent as Record<string, unknown>).type || 'payment.failed')}</span>
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.num}
              className={cn(
                'rounded-lg border bg-carbon p-3.5 flex flex-col justify-between transition-colors',
                s.border,
                s.highlight ? 'bg-gradient-to-b from-carbon to-onyx' : ''
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-text-faint">STEP {s.num}</span>
                  <Icon className={cn('h-4 w-4', s.color)} />
                </div>
                <div className="mt-1.5 font-serif text-[14px] font-semibold text-paper">
                  {s.title}
                </div>
                <p className="mt-0.5 text-[11px] text-text-muted leading-relaxed">
                  {s.desc}
                </p>
              </div>

              <div className="mt-3 border-t border-border/50 pt-2">
                <span className={cn('font-mono text-xs font-semibold', s.highlight ? 'text-paper' : 'text-bone')}>
                  {s.stat}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
