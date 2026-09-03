import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Brain, BarChart3, Sparkles, Activity, Layers, Info } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { useDateRange } from '../lib/dateRange'
import { useSseFeed } from '../lib/useSse'
import { Card, CardTitle, PageHeader, Table, Td, Tr, Button } from '../components/common/primitives'
import { QueryBoundary } from '../components/common/states'
import { DisclaimerNote } from '../components/common/badges'
import { MLProbabilityCurve } from '../components/common/MLProbabilityCurve'
import { MLFeatureWeights } from '../components/common/MLFeatureWeights'
import { DecisionEventStream } from '../components/common/DecisionEventStream'
import { SpotlightCard } from '../components/reactbits/SpotlightCard'
import { GlowBackdrop } from '../components/reactbits/GlowBackdrop'
import { LiveBeacon } from '../components/reactbits/LiveBeacon'
import { exportCsv } from '../lib/exportCsv'
import { sound } from '../lib/sound'
import { cn } from '../lib/utils'

const COLORS = ['#cc9166', '#c7a882', '#b9a58e', '#9194a1', '#777a88', '#e2e3e9', '#acafb9', '#5e616e']
const AXIS = '#1c1d22'
const TICK = '#9194a1'

const tooltipStyle = {
  background: '#121317',
  border: '1px solid #2e3038',
  borderRadius: 10,
  fontSize: 12,
  color: '#e2e3e9',
} as const

export default function Analytics() {
  const { fromDate, toDate, rangeKey } = useDateRange()
  const [activeTab, setActiveTab] = useState<'brain' | 'decline'>('brain')

  const stats = useQuery({
    queryKey: qk.stats(rangeKey),
    queryFn: () => api.stats(fromDate, toDate),
  })
  const health = useQuery({ queryKey: qk.issuerHealth(), queryFn: () => api.issuerHealth() })
  const { events, connected } = useSseFeed(40)

  const handleExportCsv = () => {
    if (!health.data?.issuers) return
    exportCsv(
      'issuer_health_and_analytics',
      [
        { key: 'issuer', label: 'Bank / Issuer' },
        { key: 'method', label: 'Method' },
        { key: 'recent_failures', label: 'Recent Failures' },
        { key: 'threshold', label: 'Alarm Threshold' },
        { key: 'status', label: 'Health Status' },
      ],
      health.data.issuers
    )
  }

  return (
    <div className="relative space-y-6 max-w-7xl mx-auto pb-12">
      <GlowBackdrop color="copper" />

      <PageHeader
        title="AI Intelligence Centre"
        sub="The autonomous brain: 240-hour recovery probability surface, GradientBoosting feature signals, and real-time decision stream."
        action={
          <Button
            variant="default"
            onClick={handleExportCsv}
            disabled={!health.data?.issuers?.length}
            title="Export issuer health performance dataset as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        }
      />

      {/* Model Performance KPI Row with Explanatory Tooltips */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard
          className="relative p-5 shadow-sm cursor-help hover:border-copper/60 transition-colors overflow-hidden flex flex-col justify-between min-h-[140px]"
          spotlightColor="rgba(204, 145, 102, 0.2)"
          title="Model Discrimination (0.717 ROC-AUC): Measures the model's ability to rank high-recovery windows above low-recovery windows across the 240-hour candidate horizon."
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
              <span>Model Discrimination</span>
              <Info className="h-3 w-3 text-text-faint" />
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-copper/15 text-copper">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="font-serif text-3xl font-bold text-paper my-1 leading-none">0.717</div>
          <div className="text-xs text-text-muted leading-tight">
            ROC-AUC metric across 10-day test set
          </div>
        </SpotlightCard>

        <SpotlightCard
          className="p-5 shadow-sm cursor-help hover:border-copper/60 transition-colors flex flex-col justify-between min-h-[140px]"
          spotlightColor="rgba(204, 145, 102, 0.18)"
          title="Accuracy & Precision (69.3%): Overall test set classification accuracy of the GradientBoostingClassifier predicting successful vs failed retry attempts."
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
              <span>Accuracy & Precision</span>
              <Info className="h-3 w-3 text-text-faint" />
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-copper/15 text-copper">
              <Brain className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="font-serif text-3xl font-bold text-paper my-1 leading-none">69.3%</div>
          <div className="text-xs text-text-muted leading-tight">
            GradientBoostingClassifier accuracy
          </div>
        </SpotlightCard>

        <SpotlightCard
          className="p-5 shadow-sm cursor-help hover:border-steel transition-colors flex flex-col justify-between min-h-[140px]"
          spotlightColor="rgba(226, 227, 233, 0.12)"
          title="Training Volume (10,000 vectors): Trained on 10,000 synthetic transaction recovery histories reflecting primary-source empirical decline patterns."
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
              <span>Training Volume</span>
              <Info className="h-3 w-3 text-text-faint" />
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-carbon border border-border text-bone">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="font-serif text-3xl font-bold text-paper my-1 leading-none">10,000</div>
          <div className="text-xs text-text-muted leading-tight">
            Pre-trained recovery training vectors
          </div>
        </SpotlightCard>

        <SpotlightCard
          className="p-5 shadow-sm cursor-help hover:border-copper/60 transition-colors flex flex-col justify-between min-h-[140px]"
          spotlightColor="rgba(204, 145, 102, 0.15)"
          title="Scan Horizon (240 Hours / 10 Days): Searches up to 10 days out because >60% of insufficient funds recoveries occur between day 1 and day 7 (payday cycles)."
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
              <span>Scan Horizon</span>
              <Info className="h-3 w-3 text-text-faint" />
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-copper/15 text-copper">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="font-serif text-3xl font-bold text-paper my-1 leading-none">240 Hours</div>
          <div className="text-xs text-text-muted leading-tight">
            10-day hourly probability surface
          </div>
        </SpotlightCard>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-border/80 pb-2">
        <button
          type="button"
          onClick={() => {
            sound.click()
            setActiveTab('brain')
          }}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer',
            activeTab === 'brain'
              ? 'bg-copper text-obsidian shadow-sm'
              : 'text-text-muted hover:text-paper hover:bg-carbon'
          )}
          title="Inspect the 240-hour live probability surface, GradientBoosting feature weights, and real-time decision stream."
        >
          <Brain className="h-3.5 w-3.5" />
          <span>AI Brain & Micro-Decisions</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.click()
            setActiveTab('decline')
          }}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer',
            activeTab === 'decline'
              ? 'bg-copper text-obsidian shadow-sm'
              : 'text-text-muted hover:text-paper hover:bg-carbon'
          )}
          title="View decline reason distributions and bank authorization health metrics."
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Decline Breakdown & Payment Rails</span>
        </button>
      </div>

      {activeTab === 'brain' ? (
        <div className="space-y-6">
          {/* Section 1A: 240-Hour Animated Probability Curve */}
          <MLProbabilityCurve
            chosenHour={34}
            confidence={0.84}
            errorReason="insufficient_funds"
            cardIssuer="HDFC"
            paymentId="pay_sim_soft_d41"
          />

          {/* Grid: Feature Weights + Live Decision Event Stream */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Section 1B: Feature Weights */}
            <MLFeatureWeights />

            {/* Section 1C: Live Decision Event Stream */}
            <DecisionEventStream events={events} connected={connected} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Decline Distribution & Rail Switch Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <QueryBoundary query={stats} skeletonRows={5}>
              {(s) => {
                const byReason: Record<string, number> = {}
                for (const [key, n] of Object.entries(s.decline_funnel)) {
                  const reason = key.split('|')[0]
                  byReason[reason] = (byReason[reason] ?? 0) + n
                }
                const data = Object.entries(byReason)
                  .map(([reason, count]) => ({ reason, count }))
                  .sort((a, b) => b.count - a.count)

                return (
                  <Card className="p-6">
                    <CardTitle>
                      <div>
                        <div className="font-semibold text-paper">Decline Reason Distribution</div>
                        <div className="text-xs text-text-muted">Top reasons for payment failure across the selected date range.</div>
                      </div>
                    </CardTitle>
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 24 }}>
                          <CartesianGrid stroke="#1c1d22" vertical={false} />
                          <XAxis
                            dataKey="reason"
                            tick={{ fill: TICK, fontSize: 10 }}
                            angle={-20}
                            textAnchor="end"
                            interval={0}
                            axisLine={{ stroke: AXIS }}
                            tickLine={false}
                          />
                          <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {data.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )
              }}
            </QueryBoundary>

            <QueryBoundary query={stats} skeletonRows={5}>
              {(s) => {
                const data = Object.entries(s.rail_split).map(([rail, count]) => ({ rail, count }))
                return (
                  <Card className="p-6">
                    <CardTitle>
                      <div>
                        <div className="font-semibold text-paper">Recovery Rail Switch Split</div>
                        <div className="text-xs text-text-muted">Automated rerouting of card failures onto UPI Autopay and alternate rails.</div>
                      </div>
                    </CardTitle>
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                          <CartesianGrid stroke="#1c1d22" vertical={false} />
                          <XAxis dataKey="rail" tick={{ fill: TICK, fontSize: 11 }} axisLine={{ stroke: AXIS }} tickLine={false} />
                          <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {data.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )
              }}
            </QueryBoundary>
          </div>

          {/* Issuer Health Real-Time Table */}
          <Card className="p-6">
            <CardTitle>
              <div>
                <div className="font-semibold text-paper">Real-Time Issuer Health Matrix</div>
                <div className="text-xs text-text-muted">15-minute rolling window monitoring bank authorization stability and gateway health.</div>
              </div>
            </CardTitle>
            <div className="mt-4">
              <QueryBoundary query={health} skeletonRows={4}>
                {(h) => (
                  <Table head={['Bank / Issuer', 'Method', 'Recent Failures (15m)', 'Alarm Threshold', 'Health Status']}>
                    {h.issuers.map((iss) => (
                      <Tr key={`${iss.issuer}-${iss.method}`}>
                        <Td className="font-semibold text-paper">{iss.issuer}</Td>
                        <Td className="uppercase text-text-muted font-semibold">{iss.method}</Td>
                        <Td mono className="text-bone">{iss.recent_failures}</Td>
                        <Td mono className="text-text-muted">{iss.threshold}</Td>
                        <Td>
                          <LiveBeacon
                            status={iss.status === 'healthy' ? 'active' : 'warning'}
                            label={iss.status.toUpperCase()}
                            size="sm"
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Table>
                )}
              </QueryBoundary>
            </div>
          </Card>
        </div>
      )}

      <DisclaimerNote>
        Synthetic training data generated via docs/research-brief.md parameter priors. Predictions demonstrate autonomous scheduling capability.
      </DisclaimerNote>
    </div>
  )
}
