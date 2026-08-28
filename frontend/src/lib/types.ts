export type Feature = [string, number]

export interface PendingRetry {
  payment_id: string
  amount_inr: number
  retry_at: string | null
  classify_reason: string | null
  chosen_rail: string | null
  confidence: number | null
  top_features: Feature[]
  nudge_reasoning: string | null
  nudge_message: string | null
  payment_link_url: string | null
}

export interface HardDecline {
  payment_id: string
  reason: string | null
  amount_inr: number
  created_at: string | null
}

export interface Stats {
  total_failed: number
  soft: number
  hard: number
  retries_scheduled: number
  recovered: number
  merchant_cancelled: number
  recovery_rate_pct: number
  revenue_recovered_inr: number
  channel_breakdown: Record<string, number>
  pending_retries: PendingRetry[]
  decline_funnel: Record<string, number>
  rail_split: Record<string, number>
  hard_decline_list: HardDecline[]
}

export interface Funnel {
  total_failed: number
  classified_soft: number
  classified_hard: number
  compliance_blocked: number
  ev_skipped: number
  trajectory_blocked: number
  maintenance_snapped: number
  scheduled: number
  fired: number
  nudged: number
  recovered: number
}

export interface AuditRow {
  id: number
  payment_id: string
  action: string
  detail: string
  ts: string
}

export interface AuditPage {
  page: number
  limit: number
  rows: AuditRow[]
}

export interface DowntimeBoard {
  active_downtimes: { id: number; method: string; issuer: string; started_at: string; status: string }[]
  queued_payments: { payment_id: string; queued_at: string; method: string; issuer: string }[]
}

export interface Insight {
  finding: string
  source: string
}
export interface Insights {
  insights: Insight[]
  generated_by: string
}

export interface IssuerHealth {
  issuers: { issuer: string; method: string; recent_failures: number; status: string; threshold: number }[]
  window_minutes: number
}

export interface ModelHealth {
  model_loaded: boolean
  status: 'green' | 'amber' | 'red'
  note?: string
  top_features?: Feature[]
  mean_confidence_last100?: number | null
  fallback_rate_pct?: number
}

export interface RoiProjection {
  note: string
  inputs: { gmv_monthly_inr: number; failure_rate_pct: number }
  failed_monthly_inr: number
  currently_recovered_inr: number
  with_agent_inr: number
  monthly_lift_inr: number
  annual_lift_inr: number
  fines_avoided_annual_inr: number
  control_rate_pct: number
  agent_rate_pct: number
}

export interface FineAvoidance {
  fines_avoided_inr: number
  blocked_hard_declines: number
  blocked_cap_violations: number
  blocked_card_testing: number
  breakdown: { visa_domestic_inr: number; visa_crossborder_inr: number; mc_excessive_retry_inr: number }
}

export interface CostAnalysis {
  total_nudge_spend_inr: number
  revenue_recovered_inr: number
  net_roi_inr: number
  roi_multiple: number | null
  per_channel: Record<string, { count: number; spend_inr: number }>
  note: string
}

export interface BacktestPolicy {
  policy: string
  recovery_rate_pct: number
  recovered: number
  attempts: number
  fines_inr: number
}
export interface Backtest {
  policies?: BacktestPolicy[]
  aggressive_fines_inr?: number
  ours_fines_inr?: number
  disclaimer?: string
  error?: string
  [k: string]: unknown
}

export interface PaymentDetail {
  event: Record<string, unknown>
  decline_history: { error_reason: string | null; created_at: string }[]
  audit: AuditRow[]
}

export interface SseEvent {
  type: string
  payment_id: string
  ts: string
  detail: Record<string, unknown>
}

export type ScenarioId =
  | 'soft'
  | 'hard'
  | 'downtime'
  | 'card_testing'
  | 'trajectory'
  | 'ev_negative'
  | 'payday'

export interface SimulateResult {
  created: string[]
  events_emitted: number
}
