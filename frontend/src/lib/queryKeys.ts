export const qk = {
  stats: (range: string) => ['stats', range] as const,
  backtest: () => ['backtest'] as const,
  audit: (filters: Record<string, unknown>) => ['audit', filters] as const,
  downtime: () => ['downtime'] as const,
  insights: () => ['insights'] as const,
  issuerHealth: () => ['issuerHealth'] as const,
  funnel: () => ['funnel'] as const,
  modelHealth: () => ['modelHealth'] as const,
  costAnalysis: () => ['costAnalysis'] as const,
  fineAvoidance: () => ['fineAvoidance'] as const,
  roi: (gmv: number, rate: number) => ['roi', gmv, rate] as const,
  payment: (id: string) => ['payment', id] as const,
}
