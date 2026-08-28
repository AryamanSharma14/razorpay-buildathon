import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function ClassPill({ value }: { value: string | null | undefined }) {
  const v = (value || 'unknown').toLowerCase()
  const map: Record<string, string> = {
    soft: 'bg-info/15 text-info',
    hard: 'bg-neg/15 text-neg',
    infrastructure: 'bg-infra/15 text-infra',
  }
  return <Pill className={map[v] ?? 'bg-surface-hover text-text-muted'}>{v}</Pill>
}

export function RailPill({ value }: { value: string | null | undefined }) {
  const v = (value || 'card').toLowerCase()
  return (
    <Pill className={v === 'upi' ? 'bg-pos/15 text-pos' : 'bg-surface-hover text-text-muted'}>{v}</Pill>
  )
}

// Single source of truth for audit action -> colour + plain-English label.
// Labels are written for a non-technical reader; the raw action id is kept in
// the badge's title attribute for traceability.
const ACTION_STYLE: Record<string, { c: string; label: string }> = {
  classified: { c: 'bg-info/15 text-info', label: 'failure type identified' },
  scheduled: { c: 'bg-warn/15 text-warn', label: 'retry scheduled' },
  hard_stop: { c: 'bg-neg/15 text-neg', label: 'stopped: cannot succeed' },
  hard_guard: { c: 'bg-neg/15 text-neg', label: 'blocked: permanent failure' },
  network_cap_block: { c: 'bg-neg/15 text-neg', label: 'blocked: network retry limit' },
  cardtesting_spacing_block: { c: 'bg-neg/15 text-neg', label: 'blocked: fraud-pattern spacing' },
  skipped_uneconomic: { c: 'bg-warn/15 text-warn', label: 'skipped: costs more than it returns' },
  trajectory_block: { c: 'bg-neg/15 text-neg', label: 'blocked: too many failed attempts' },
  claude_abandon: { c: 'bg-ai/15 text-ai', label: 'AI decision: stop retrying' },
  recovery_attempt: { c: 'bg-accent/15 text-accent', label: 'retry attempted' },
  nudge_sent: { c: 'bg-info/15 text-info', label: 'customer reminded' },
  recovered: { c: 'bg-pos/15 text-pos', label: 'payment recovered' },
  rail_routed: { c: 'bg-pos/15 text-pos', label: 'switched to UPI' },
  force_now: { c: 'bg-accent/15 text-accent', label: 'manual retry' },
  merchant_cancelled: { c: 'bg-surface-hover text-text-muted', label: 'merchant cancelled' },
  downtime_started: { c: 'bg-infra/15 text-infra', label: 'bank outage detected' },
  downtime_resolved: { c: 'bg-pos/15 text-pos', label: 'bank back online' },
  downtime_queued: { c: 'bg-infra/15 text-infra', label: 'parked until bank recovers' },
  downtime_drain: { c: 'bg-pos/15 text-pos', label: 'retrying parked payments' },
  maintenance_window_snap: { c: 'bg-warn/15 text-warn', label: 'moved past maintenance window' },
  payday_snapped: { c: 'bg-warn/15 text-warn', label: 'moved to payday' },
  otp_fast_retry: { c: 'bg-info/15 text-info', label: 'quick retry (OTP issue)' },
  duplicate: { c: 'bg-surface-hover text-text-faint', label: 'duplicate ignored' },
}

export function auditLabel(action: string) {
  return ACTION_STYLE[action]?.label ?? action.replace(/_/g, ' ')
}

export function AuditActionBadge({ action }: { action: string }) {
  const s = ACTION_STYLE[action] ?? { c: 'bg-surface-hover text-text-muted', label: action.replace(/_/g, ' ') }
  return (
    <span title={`raw action: ${action}`}>
      <Pill className={s.c}>{s.label}</Pill>
    </span>
  )
}

export const KNOWN_AUDIT_ACTIONS = Object.keys(ACTION_STYLE)

export function DisclaimerNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-sm border-l-2 border-warn bg-warn/5 px-3 py-2 text-[12px] leading-relaxed text-text-muted">
      {children}
    </div>
  )
}
