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

// Single source of truth for audit action -> colour + label. Replaces the old inline actionColor map.
const ACTION_STYLE: Record<string, { c: string; label: string }> = {
  classified: { c: 'bg-info/15 text-info', label: 'classified' },
  scheduled: { c: 'bg-warn/15 text-warn', label: 'scheduled' },
  hard_stop: { c: 'bg-neg/15 text-neg', label: 'hard stop' },
  hard_guard: { c: 'bg-neg/15 text-neg', label: 'hard guard' },
  network_cap_block: { c: 'bg-neg/15 text-neg', label: 'cap block' },
  cardtesting_spacing_block: { c: 'bg-neg/15 text-neg', label: 'card-testing block' },
  skipped_uneconomic: { c: 'bg-warn/15 text-warn', label: 'EV skip' },
  trajectory_block: { c: 'bg-neg/15 text-neg', label: 'trajectory block' },
  claude_abandon: { c: 'bg-ai/15 text-ai', label: 'claude abandon' },
  recovery_attempt: { c: 'bg-accent/15 text-accent', label: 'retry fired' },
  nudge_sent: { c: 'bg-info/15 text-info', label: 'nudge sent' },
  recovered: { c: 'bg-pos/15 text-pos', label: 'recovered' },
  rail_routed: { c: 'bg-pos/15 text-pos', label: 'rail routed' },
  force_now: { c: 'bg-accent/15 text-accent', label: 'force now' },
  merchant_cancelled: { c: 'bg-surface-hover text-text-muted', label: 'cancelled' },
  downtime_started: { c: 'bg-infra/15 text-infra', label: 'downtime start' },
  downtime_resolved: { c: 'bg-pos/15 text-pos', label: 'downtime resolved' },
  downtime_queued: { c: 'bg-infra/15 text-infra', label: 'parked' },
  downtime_drain: { c: 'bg-pos/15 text-pos', label: 'drained' },
  maintenance_window_snap: { c: 'bg-warn/15 text-warn', label: 'maint. snap' },
  payday_snapped: { c: 'bg-warn/15 text-warn', label: 'payday snap' },
  otp_fast_retry: { c: 'bg-info/15 text-info', label: 'otp fast-retry' },
  duplicate: { c: 'bg-surface-hover text-text-faint', label: 'duplicate' },
}

export function auditLabel(action: string) {
  return ACTION_STYLE[action]?.label ?? action.replace(/_/g, ' ')
}

export function AuditActionBadge({ action }: { action: string }) {
  const s = ACTION_STYLE[action] ?? { c: 'bg-surface-hover text-text-muted', label: action.replace(/_/g, ' ') }
  return <Pill className={s.c}>{s.label}</Pill>
}

export const KNOWN_AUDIT_ACTIONS = Object.keys(ACTION_STYLE)

export function DisclaimerNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-sm border-l-2 border-warn bg-warn/5 px-3 py-2 text-[12px] leading-relaxed text-text-muted">
      {children}
    </div>
  )
}
