import { Check, Clock, Minus, ShieldCheck, type LucideIcon } from 'lucide-react'

// The one four-way outcome language. Replaces the old green/red/amber spread.
// bucket -> Tailwind text/bg classes (Slash tokens) + icon + human label.
export type Outcome = 'recovered' | 'blocked' | 'skipped' | 'pending'

export const OUTCOME: Record<
  Outcome,
  { text: string; bg: string; rail: string; icon: LucideIcon; label: string }
> = {
  recovered: { text: 'text-paper', bg: 'bg-paper/10', rail: 'bg-paper', icon: Check, label: 'Recovered' },
  blocked: { text: 'text-copper', bg: 'bg-copper/10', rail: 'bg-copper', icon: ShieldCheck, label: 'Blocked' },
  skipped: { text: 'text-steel', bg: 'bg-steel/10', rail: 'bg-steel', icon: Minus, label: 'Skipped' },
  pending: { text: 'text-fog', bg: 'bg-fog/10', rail: 'bg-fog', icon: Clock, label: 'Pending' },
}

// Every audit action id maps to exactly one bucket. Keep in sync with
// badges.tsx ACTION_STYLE keys — the unit test asserts full coverage.
export const ACTION_OUTCOME: Record<string, Outcome> = {
  classified: 'pending',
  scheduled: 'pending',
  hard_stop: 'blocked',
  hard_guard: 'blocked',
  network_cap_block: 'blocked',
  cardtesting_spacing_block: 'blocked',
  trajectory_block: 'blocked',
  claude_abandon: 'blocked',
  skipped_uneconomic: 'skipped',
  duplicate: 'skipped',
  merchant_cancelled: 'skipped',
  recovery_attempt: 'pending',
  recovery_attempted: 'pending',
  nudge_sent: 'pending',
  force_now: 'pending',
  rail_routed: 'pending',
  otp_fast_retry: 'pending',
  maintenance_window_snap: 'pending',
  payday_snapped: 'pending',
  downtime_started: 'pending',
  downtime_queued: 'pending',
  downtime_drain: 'pending',
  downtime_resolved: 'recovered',
  recovered: 'recovered',
}

export function outcomeOf(action: string): Outcome {
  return ACTION_OUTCOME[action] ?? 'pending'
}
