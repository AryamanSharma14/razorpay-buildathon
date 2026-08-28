import type {
  Stats, Funnel, AuditPage, DowntimeBoard, Insights, IssuerHealth,
  ModelHealth, RoiProjection, FineAvoidance, CostAnalysis, Backtest,
  PaymentDetail, ScenarioId, SimulateResult,
} from './types'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`)
  return res.json() as Promise<T>
}

async function send<T>(method: 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`)
  return res.json() as Promise<T>
}

const qs = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = {
  ping: () => get<{ status: string; demo_mode: boolean }>('/ping'),
  stats: (from?: string, to?: string) =>
    get<Stats>('/dashboard/stats' + qs({ from_date: from, to_date: to })),
  funnel: () => get<Funnel>('/dashboard/funnel'),
  backtest: () => get<Backtest>('/backtest'),
  audit: (f: { page?: number; limit?: number; action?: string; payment_id?: string }) =>
    get<AuditPage>('/dashboard/audit' + qs(f)),
  downtime: () => get<DowntimeBoard>('/dashboard/downtime'),
  insights: (bust?: number) => get<Insights>('/dashboard/insights' + qs({ bust })),
  issuerHealth: () => get<IssuerHealth>('/dashboard/issuer-health'),
  modelHealth: () => get<ModelHealth>('/dashboard/model-health'),
  costAnalysis: () => get<CostAnalysis>('/dashboard/cost-analysis'),
  fineAvoidance: () => get<FineAvoidance>('/dashboard/fine-avoidance'),
  roi: (gmv: number, rate: number) =>
    get<RoiProjection>('/dashboard/roi-projection' + qs({ gmv_monthly: gmv, failure_rate_pct: rate })),
  payment: (id: string) => get<PaymentDetail>(`/dashboard/payment/${encodeURIComponent(id)}`),

  forceRetry: (id: string) => send<{ fired: boolean }>('POST', `/retry/${encodeURIComponent(id)}/now`),
  cancelRetry: (id: string) => send<{ cancelled: boolean }>('DELETE', `/retry/${encodeURIComponent(id)}`),

  simulate: (body: {
    scenario: ScenarioId
    count?: number
    issuer?: string | null
    network?: string | null
    amount_min_inr?: number | null
    amount_max_inr?: number | null
    international?: boolean
    advance_hours?: number
  }) => send<SimulateResult>('POST', '/simulate', body),
  simulateReset: () => send<{ reset: boolean }>('POST', '/simulate/reset'),
}
