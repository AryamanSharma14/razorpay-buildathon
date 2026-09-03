import type { ReactNode } from 'react'
import { CheckCircle2, ShieldAlert, Clock, MinusCircle, AlertCircle, Smartphone } from 'lucide-react'
import { cn } from '../../lib/utils'
import { outcomeOf } from '../../lib/outcome'

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight transition-colors shadow-xs',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function ClassPill({ value }: { value: string | null | undefined }) {
  const v = (value || 'unknown').toLowerCase()
  if (v === 'soft') {
    return (
      <Pill className="border-copper/40 bg-copper/10 text-copper">
        <Clock className="h-3 w-3" />
        <span>Soft (Recoverable)</span>
      </Pill>
    )
  }
  if (v === 'hard') {
    return (
      <Pill className="border-copper/50 bg-copper/15 text-copper">
        <ShieldAlert className="h-3 w-3" />
        <span>Hard (Blocked)</span>
      </Pill>
    )
  }
  return <Pill className="border-border bg-carbon text-text-muted">{v}</Pill>
}

export function RailPill({ value }: { value: string | null | undefined }) {
  const v = (value || 'card').toLowerCase()
  if (v === 'upi' || v.includes('whatsapp')) {
    return (
      <Pill className="border-pos/40 bg-pos/10 text-pos">
        <Smartphone className="h-3 w-3" />
        <span>WhatsApp UPI</span>
      </Pill>
    )
  }
  return <Pill className="border-border bg-carbon text-bone font-mono">{v.toUpperCase()}</Pill>
}

// Single source of truth for audit action -> plain-English label.
const ACTION_LABEL: Record<string, { label: string; icon?: React.ComponentType<{ className?: string }> }> = {
  classified: { label: 'Decline Analyzed', icon: AlertCircle },
  scheduled: { label: 'ML Retry Timed', icon: Clock },
  hard_stop: { label: 'Blocked: Zero Retries', icon: ShieldAlert },
  hard_guard: { label: 'Blocked: Permanent Decline', icon: ShieldAlert },
  network_cap_block: { label: 'Blocked: Retry Limit', icon: ShieldAlert },
  cardtesting_spacing_block: { label: 'Blocked: Fraud Pattern', icon: ShieldAlert },
  skipped_uneconomic: { label: 'Skipped: Micro-Charge', icon: MinusCircle },
  trajectory_block: { label: 'Blocked: Failure Chain', icon: ShieldAlert },
  claude_abandon: { label: 'AI Guard Triggered', icon: ShieldAlert },
  recovery_attempt: { label: 'Recovery Fired', icon: Clock },
  nudge_sent: { label: 'Customer Notified', icon: Smartphone },
  recovered: { label: 'Payment Recovered', icon: CheckCircle2 },
  rail_routed: { label: 'Switched to UPI', icon: Smartphone },
  force_now: { label: 'Manual Retry Fired', icon: Clock },
  merchant_cancelled: { label: 'Cancelled by Merchant', icon: MinusCircle },
  downtime_started: { label: 'Bank Outage Detected', icon: AlertCircle },
  downtime_resolved: { label: 'Bank Back Online', icon: CheckCircle2 },
  downtime_queued: { label: 'Parked During Outage', icon: Clock },
  downtime_drain: { label: 'Retrying Parked Queue', icon: Clock },
  maintenance_window_snap: { label: 'Maintenance Bypassed', icon: Clock },
  payday_snapped: { label: 'Payday Snapped', icon: Clock },
  otp_fast_retry: { label: 'Quick Retry (OTP)', icon: Clock },
  duplicate: { label: 'Duplicate Ignored', icon: MinusCircle },
}

export function auditLabel(action: string) {
  return ACTION_LABEL[action]?.label ?? action.replace(/_/g, ' ')
}

export function AuditActionBadge({ action }: { action: string }) {
  const outcomeKey = outcomeOf(action)
  const config = ACTION_LABEL[action]
  const Icon = config?.icon

  const styleMap = {
    recovered: 'border-pos/40 bg-pos/10 text-pos',
    blocked: 'border-copper/40 bg-copper/10 text-copper',
    skipped: 'border-steel/40 bg-steel/10 text-fog',
    pending: 'border-copper/30 bg-copper/5 text-bone',
  }[outcomeKey]

  return (
    <span title={`Action: ${action}`}>
      <Pill className={styleMap}>
        {Icon && <Icon className="h-3 w-3 shrink-0" />}
        <span>{auditLabel(action)}</span>
      </Pill>
    </span>
  )
}

export const KNOWN_AUDIT_ACTIONS = Object.keys(ACTION_LABEL)

export function DisclaimerNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-copper/30 bg-copper/5 p-3 text-xs leading-relaxed text-text-muted">
      {children}
    </div>
  )
}
