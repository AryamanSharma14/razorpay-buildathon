import { useState } from 'react'
import {
  GitCommit,
  ShieldCheck,
  Server,
  Sparkles,
  TrendingUp,
  Send,
} from 'lucide-react'
import { inr } from '../../lib/format'
import { cn } from '../../lib/utils'
import { sound } from '../../lib/sound'

interface AgentDecisionTraceProps {
  paymentId?: string
  amountInr?: number
  reason?: string
  method?: string
  issuer?: string
  network?: string
  isHardDecline?: boolean
  isDowntime?: boolean
  selectedHour?: number
  confidencePct?: number
  evInr?: number
  channelCostInr?: number
  channel?: string
  nudgeReasoning?: string
}

export function AgentDecisionTrace({
  paymentId = 'pay_sim_soft_07df',
  amountInr = 1499,
  reason = 'insufficient_funds',
  method = 'card',
  issuer = 'HDFC',
  network = 'visa',
  isHardDecline = false,
  isDowntime = false,
  selectedHour = 34,
  confidencePct = 84,
  evInr = 41.8,
  channelCostInr = 0.35,
  channel = 'WhatsApp (1-Tap UPI)',
  nudgeReasoning = 'Customer account receives salary deposit batch at hour 34. Sufficient funds availability verified by GradientBoosting weights (+39% over baseline).',
}: AgentDecisionTraceProps) {
  const [activeStep, setActiveStep] = useState<number>(3)

  const steps = [
    {
      id: 0,
      title: '1. Webhook Ingest',
      shortTitle: 'Ingest',
      icon: GitCommit,
      status: 'success' as const,
      summary: `payment.failed: ${inr(amountInr)} (${method}/${network.toUpperCase()})`,
      detail: {
        'Payment ID': paymentId,
        'Decline Reason': reason,
        'Method / Rail': `${method} (${issuer} ${network.toUpperCase()})`,
        'Order Amount': inr(amountInr),
        'Source': 'Razorpay Core Gateway',
      },
    },
    {
      id: 1,
      title: '2. Regulatory & Compliance',
      shortTitle: 'Compliance',
      icon: ShieldCheck,
      status: isHardDecline ? ('blocked' as const) : ('success' as const),
      summary: isHardDecline
        ? 'Visa Cat-1 Hard Stop: Retries blocked (Saved ₹8.30 fine)'
        : 'Visa Cat-4 Soft: Retry permitted (0 prior attempts)',
      detail: {
        'Visa Decline Classification': isHardDecline ? 'Category 1 (Permanent / Revoked)' : 'Category 4 (Soft / Retryable)',
        'Network Fine Avoidance': isHardDecline ? 'INR 8.30 saved ($0.10 domestic)' : 'INR 0.00 (Compliant)',
        '30-Day Rolling Cap': '1 / 20 attempts used (Visa)',
        'TRAI Messaging Rule': 'Within 7-day explicit consent window (Service message)',
      },
    },
    {
      id: 2,
      title: '3. Bank Downtime Sentinel',
      shortTitle: 'Downtime',
      icon: Server,
      status: isDowntime ? ('warn' as const) : ('success' as const),
      summary: isDowntime
        ? `${issuer} Netbanking outage detected (Transaction parked)`
        : `${issuer} Gateway health verified: Nominal (0 active incidents)`,
      detail: {
        'Issuer Health Status': isDowntime ? 'Active Outage Incident' : 'Operational / High Success',
        'Action': isDowntime ? 'Park in hold queue (Wait for payment.downtime.resolved)' : 'Proceed to ML timing scan',
        'Burn Risk': 'Zero quota burned during infrastructure disruption',
      },
    },
    {
      id: 3,
      title: '4. ML 240h Horizon Scan',
      shortTitle: 'ML Horizon',
      icon: Sparkles,
      status: 'success' as const,
      summary: `Optimal window: Hour ${selectedHour} (${confidencePct}% probability)`,
      detail: {
        'Scan Horizon': '1 to 240 Hours (10 Days continuous)',
        'Selected Timing': `Hour ${selectedHour} (Day ${Math.floor((selectedHour - 1) / 24) + 1})`,
        'Feature Drivers': 'Salary credit deposit cycle (+39%), elapsed time decay (-12%)',
        'Model Lift': '+15.6 pts advantage vs naive 24-hour retry',
      },
    },
    {
      id: 4,
      title: '5. Unit Economics Gate',
      shortTitle: 'EV Gate',
      icon: TrendingUp,
      status: evInr > 0 ? ('success' as const) : ('blocked' as const),
      summary: evInr > 0
        ? `Positive EV: +${inr(evInr)} net expected margin (API fee: ${inr(channelCostInr)})`
        : `Negative EV: Skipped chasing to protect merchant profit margin`,
      detail: {
        'Expected Value Formula': 'EV = (p_recover × OrderAmount) - ChannelCost',
        'Expected Recovery': inr(Math.round((confidencePct / 100) * amountInr)),
        'Messaging Channel Cost': inr(channelCostInr),
        'Net Merchant Yield': inr(evInr),
      },
    },
    {
      id: 5,
      title: '6. Action Dispatch',
      shortTitle: 'Dispatch',
      icon: Send,
      status: isHardDecline ? ('blocked' as const) : ('success' as const),
      summary: isHardDecline
        ? 'Rerouted to UPI Autopay Payment Link'
        : `Scheduled via ${channel}`,
      detail: {
        'Action Dispatched': isHardDecline ? 'Generate Alternate Rail Link' : 'Schedule Intelligent Nudge',
        'Delivery Channel': channel,
        'Nudge Reasoning': nudgeReasoning,
      },
    },
  ]

  const current = steps[activeStep]

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4 text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-copper/20 text-copper font-mono text-xs">
            AI
          </div>
          <div>
            <h4 className="font-serif text-sm font-bold text-paper">Autonomous Agent Decision Trace</h4>
            <p className="text-[11px] text-text-muted">
              Step-by-step mathematical & regulatory reasoning chain for this transaction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-copper bg-copper/10 px-3 py-1 rounded-full border border-copper/30">
          <span>Click any node to inspect decision trace</span>
        </div>
      </div>

      {/* Horizontal Pipeline Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
        {steps.map((s, idx) => {
          const Icon = s.icon
          const isSelected = activeStep === idx

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                sound.click()
                setActiveStep(idx)
              }}
              className={cn(
                'relative flex flex-col items-start p-3 rounded-xl border transition-all text-left cursor-pointer group',
                isSelected
                  ? 'border-copper bg-carbon text-paper shadow-md scale-[1.02]'
                  : 'border-border/80 bg-onyx/80 text-text-muted hover:border-steel hover:bg-carbon'
              )}
            >
              <div className="flex w-full items-center justify-between mb-1.5">
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-lg text-xs',
                    s.status === 'success'
                      ? 'bg-pos/15 text-pos'
                      : s.status === 'blocked'
                      ? 'bg-neg/15 text-neg'
                      : 'bg-amber-500/15 text-amber-400'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="font-mono text-[10px] text-text-faint">Step {idx + 1}</span>
              </div>

              <span className="font-bold text-paper text-[11px] truncate w-full group-hover:text-copper transition-colors">
                {s.shortTitle}
              </span>
              <span
                className={cn(
                  'text-[9px] font-mono mt-1 px-1.5 py-0.5 rounded',
                  s.status === 'success'
                    ? 'bg-pos/20 text-pos'
                    : s.status === 'blocked'
                    ? 'bg-neg/20 text-neg'
                    : 'bg-amber-500/20 text-amber-400'
                )}
              >
                {s.status === 'success' ? 'PASSED' : s.status === 'blocked' ? 'SHIELDED' : 'HELD'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Selected Step Detail Inspector */}
      <div className="rounded-xl border border-border bg-carbon p-4 space-y-3 animate-in fade-in duration-150">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-paper text-sm">{current.title}</span>
            <span className="text-[11px] text-text-muted">· {current.summary}</span>
          </div>
          <span className="text-[10px] font-mono text-copper uppercase tracking-wider">
            Verified Invariant
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          {Object.entries(current.detail).map(([key, val]) => (
            <div key={key} className="flex flex-col bg-onyx/80 p-2.5 rounded-lg border border-border/50">
              <span className="text-text-faint text-[10px] font-medium uppercase tracking-wider">{key}</span>
              <span className="text-paper font-mono font-medium mt-0.5">{String(val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
