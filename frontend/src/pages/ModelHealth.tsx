import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { pct } from '../lib/format'
import { Card, CardTitle, PageHeader, StatRow } from '../components/common/primitives'
import { KpiCard } from '../components/common/KpiCard'
import { QueryBoundary } from '../components/common/states'
import { DisclaimerNote } from '../components/common/badges'

const STATUS_TONE = { green: 'pos', amber: 'warn', red: 'neg' } as const

export default function ModelHealth() {
  const health = useQuery({ queryKey: qk.modelHealth(), queryFn: () => api.modelHealth() })

  return (
    <>
      <PageHeader title="Model Health" sub="Retry-timing model status, feature importances and prediction quality" />
      <QueryBoundary query={health} skeletonRows={4}>
        {(h) => (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <KpiCard label="Model status" value={h.status.toUpperCase()} tone={STATUS_TONE[h.status] ?? 'muted'}
                sub={h.model_loaded ? 'gradient-boosted retry timing' : (h.note ?? 'model not loaded')} />
              <KpiCard label="Mean confidence (last 100)"
                value={h.mean_confidence_last100 != null ? pct(h.mean_confidence_last100 * 100) : '—'}
                tone={h.mean_confidence_last100 != null && h.mean_confidence_last100 > 0.6 ? 'pos' : 'warn'}
                sub="predicted recovery probability" />
              <KpiCard label="Fallback rate" value={pct(h.fallback_rate_pct ?? 0)} tone="info"
                sub="predictions using the 0.5 default" />
              <KpiCard label="Horizon" value="240h" tone="muted"
                sub="1–10 day retry window per research brief" />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardTitle>Top features</CardTitle>
                {(h.top_features ?? []).length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-text-muted">No model loaded — train with scripts/train_model.py.</p>
                ) : (
                  <div className="space-y-2.5">
                    {(h.top_features ?? []).map(([name, w]) => {
                      const max = Math.max(...(h.top_features ?? []).map(([, v]) => v), 0.0001)
                      return (
                        <div key={name}>
                          <div className="mb-1 flex items-baseline justify-between">
                            <span className="font-mono text-[12px] text-text-muted">{name}</span>
                            <span className="font-mono text-[12px] tabular-nums">{w.toFixed(4)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-sm bg-bg-subtle">
                            <div className="h-full rounded-sm bg-accent" style={{ width: `${(w / max) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>

              <Card>
                <CardTitle>What the model decides</CardTitle>
                <StatRow label="Output" value="delay_hours + confidence" />
                <StatRow label="Payday snapping" value="insufficient_funds → next payday window" />
                <StatRow label="Maintenance snap" value="retries moved out of bank windows" />
                <StatRow label="Issuer degradation" value="volume spike → park 1h" />
                <div className="mt-4">
                  <DisclaimerNote>
                    The model only picks <em>when</em> to retry. <em>Whether</em> a retry is allowed is decided by
                    the compliance guards (hard-decline list, network caps, EV gate, trajectory) — the model can
                    never override them.
                  </DisclaimerNote>
                </div>
              </Card>
            </div>
          </>
        )}
      </QueryBoundary>
    </>
  )
}
