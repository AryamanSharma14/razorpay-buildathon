import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { OUTCOME, outcomeOf } from '../../lib/outcome'

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function ClassPill({ value }: { value: string | null | undefined }) {
  const v = (value || 'unknown').toLowerCase()
  const b =
    v === 'soft' ? OUTCOME.pending : v === 'hard' ? OUTCOME.blocked : v === 'infrastructure' ? OUTCOME.pending : null
  return <Pill className={b ? cn(b.bg, b.text) : 'bg-carbon text-fog'}>{v}</Pill>
}

export function RailPill({ value }: { value: string | null | undefined }) {
  const v = (value || 'card').toLowerCase()
  return <Pill className={v === 'upi' ? cn(OUTCOME.recovered.bg, OUTCOME.recovered.text) : 'bg-carbon text-fog'}>{v}</Pill>
}

// Single source of truth for audit action -> plain-English label. Colour now
// comes from the four-bucket outcome map (lib/outcome.ts); the raw action id
// stays in the badge title for traceability.
const ACTION_LABEL: Record<string, string> = {
  classified: 'failure type identified',
  scheduled: 'retry scheduled',
  hard_stop: 'stopped: cannot succeed',
  hard_guard: 'blocked: permanent failure',
  network_cap_block: 'blocked: network retry limit',
  cardtesting_spacing_block: 'blocked: fraud-pattern spacing',
  skipped_uneconomic: 'skipped: costs more than it returns',
  trajectory_block: 'blocked: too many failed attempts',
  claude_abandon: 'AI decision: stop retrying',
  recovery_attempt: 'retry attempted',
  nudge_sent: 'customer reminded',
  recovered: 'payment recovered',
  rail_routed: 'switched to UPI',
  force_now: 'manual retry',
  merchant_cancelled: 'merchant cancelled',
  downtime_started: 'bank outage detected',
  downtime_resolved: 'bank back online',
  downtime_queued: 'parked until bank recovers',
  downtime_drain: 'retrying parked payments',
  maintenance_window_snap: 'moved past maintenance window',
  payday_snapped: 'moved to payday',
  otp_fast_retry: 'quick retry (OTP issue)',
  duplicate: 'duplicate ignored',
}

export function auditLabel(action: string) {
  return ACTION_LABEL[action] ?? action.replace(/_/g, ' ')
}

export function AuditActionBadge({ action }: { action: string }) {
  const b = OUTCOME[outcomeOf(action)]
  return (
    <span title={`raw action: ${action}`}>
      <Pill className={cn(b.bg, b.text)}>{auditLabel(action)}</Pill>
    </span>
  )
}

export const KNOWN_AUDIT_ACTIONS = Object.keys(ACTION_LABEL)

export function DisclaimerNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] border-l-2 border-copper bg-copper/5 px-3 py-2 text-[12px] leading-relaxed text-text-muted">
      {children}
    </div>
  )
}
