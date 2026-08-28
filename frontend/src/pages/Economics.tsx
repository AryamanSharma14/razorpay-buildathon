import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { inr, pct } from '../lib/format'
import { Card, CardTitle, PageHeader, StatRow } from '../components/common/primitives'
import { KpiCard } from '../components/common/KpiCard'
import { QueryBoundary } from '../components/common/states'
import { DisclaimerNote } from '../components/common/badges'

export default function Economics() {
  const cost = useQuery({ queryKey: qk.costAnalysis(), queryFn: () => api.costAnalysis() })
  const fines = useQuery({ queryKey: qk.fineAvoidance(), queryFn: () => api.fineAvoidance() })

  const [gmv, setGmv] = useState(5_000_000)
  const [rate, setRate] = useState(2)
  const roi = useQuery({ queryKey: qk.roi(gmv, rate), queryFn: () => api.roi(gmv, rate) })

  return (
    <>
      <PageHeader title="Economics" sub="What the agent costs to run, what it brings back, and what that's worth at your scale." />

      <QueryBoundary query={cost} skeletonRows={4}>
        {(c) => (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard label="Nudge spend" value={inr(c.total_nudge_spend_inr, { decimals: true })} tone="muted"
              sub="declared channel costs"
              tip="Money spent sending reminder messages (SMS / WhatsApp / email)." />
            <KpiCard label="Revenue recovered" value={inr(c.revenue_recovered_inr)} tone="pos"
              sub="via recovery payment links"
              tip="Money collected through the recovery payment links the agent created." />
            <KpiCard label="Net ROI" value={inr(c.net_roi_inr, { decimals: true })}
              tone={c.net_roi_inr >= 0 ? 'pos' : 'neg'}
              sub={c.roi_multiple != null ? `${c.roi_multiple}× spend` : 'no spend yet'}
              tip="Revenue recovered minus spend. Positive means the agent pays for itself." />
            <QueryBoundary query={fines} skeletonRows={2}>
              {(f) => (
                <KpiCard label="Fines avoided" value={inr(f.fines_avoided_inr, { decimals: true })} tone="warn"
                  sub={`${f.blocked_hard_declines} hard · ${f.blocked_cap_violations} cap · ${f.blocked_card_testing} card-testing`}
                  tip="Penalties that never happened because the agent blocked the risky retries that would have caused them." />
              )}
            </QueryBoundary>
          </div>
        )}
      </QueryBoundary>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <QueryBoundary query={cost} skeletonRows={4}>
          {(c) => (
            <Card>
              <CardTitle>What reminders cost</CardTitle>
              {Object.keys(c.per_channel).length === 0 ? (
                <p className="py-6 text-center text-[13px] text-text-muted">No nudges sent yet.</p>
              ) : (
                Object.entries(c.per_channel).map(([ch, v]) => (
                  <StatRow key={ch} label={`${ch} (${v.count} nudges)`} value={inr(v.spend_inr, { decimals: true })} />
                ))
              )}
              <div className="mt-4">
                <DisclaimerNote>{c.note}</DisclaimerNote>
              </div>
            </Card>
          )}
        </QueryBoundary>

        <QueryBoundary query={fines} skeletonRows={4}>
          {(f) => (
            <Card>
              <CardTitle>Which fines we dodged</CardTitle>
              <StatRow label="Visa domestic hard declines" value={inr(f.breakdown.visa_domestic_inr, { decimals: true })} />
              <StatRow label="Visa cross-border hard declines" value={inr(f.breakdown.visa_crossborder_inr, { decimals: true })} />
              <StatRow label="Mastercard excessive retry" value={inr(f.breakdown.mc_excessive_retry_inr, { decimals: true })} />
              <StatRow label="Card-testing blocks" value={f.blocked_card_testing} />
              <div className="mt-4">
                <DisclaimerNote>
                  ₹8.30 per domestic hard-decline re-presentation (Visa Cat-1), ₹20.75 cross-border,
                  ₹41.50 per Mastercard cap breach. Every block is an audit row.
                </DisclaimerNote>
              </div>
            </Card>
          )}
        </QueryBoundary>
      </div>

      <div className="mt-4">
        <Card>
          <CardTitle
            action={
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-text-faint">Monthly GMV ₹</label>
                <input type="number" value={gmv} min={0} step={100000}
                  onChange={(e) => setGmv(Number(e.target.value))}
                  className="w-32 rounded-xs border border-border bg-bg-subtle px-2 py-1 font-mono text-[12px] outline-none focus:border-accent" />
                <label className="text-[12px] text-text-faint">Failure %</label>
                <input type="number" value={rate} min={0} max={100} step={0.5}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-20 rounded-xs border border-border bg-bg-subtle px-2 py-1 font-mono text-[12px] outline-none focus:border-accent" />
              </div>
            }
          >
            ROI projection — what this is worth at your scale
          </CardTitle>
          <QueryBoundary query={roi} skeletonRows={4}>
            {(r) => (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <KpiCard label="Failed monthly" value={inr(r.failed_monthly_inr)} tone="neg"
                    sub={`${pct(r.inputs.failure_rate_pct)} of ${inr(r.inputs.gmv_monthly_inr)}`}
                    tip="How much money fails every month at this business size." />
                  <KpiCard label="Recovered today" value={inr(r.currently_recovered_inr)} tone="muted"
                    sub={`${pct(r.control_rate_pct)} untimed baseline`}
                    tip="What you'd recover with no agent — blindly retrying at random times." />
                  <KpiCard label="With agent" value={inr(r.with_agent_inr)} tone="accent"
                    sub={`${pct(r.agent_rate_pct)} ML-timed`}
                    tip="What you'd recover when the model picks the retry moment." />
                  <KpiCard label="Annual lift" value={inr(r.annual_lift_inr)} tone="pos"
                    sub={`+${inr(r.fines_avoided_annual_inr, { decimals: true })} fines avoided/yr`}
                    tip="Extra money per year from using the agent: better recovery plus avoided fines." />
                </div>
                <div className="mt-4">
                  <DisclaimerNote>{r.note}</DisclaimerNote>
                </div>
              </>
            )}
          </QueryBoundary>
        </Card>
      </div>
    </>
  )
}

