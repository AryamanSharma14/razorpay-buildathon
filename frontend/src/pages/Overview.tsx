import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { inr, pct, ago } from '../lib/format'
import { useSseFeed } from '../lib/useSse'
import { Card, CardTitle, PageHeader, Table, Td, Tr } from '../components/common/primitives'
import { KpiCard } from '../components/common/KpiCard'
import { QueryBoundary } from '../components/common/states'
import { AuditActionBadge } from '../components/common/badges'

export default function Overview() {
  const stats = useQuery({ queryKey: qk.stats('all'), queryFn: () => api.stats() })
  const fines = useQuery({ queryKey: qk.fineAvoidance(), queryFn: () => api.fineAvoidance() })
  const { events, connected } = useSseFeed(12)

  return (
    <>
      <PageHeader
        title="Overview"
        sub="Compliance-bounded recovery across every failed payment"
        action={
          <span className="flex items-center gap-1.5 text-[11px] text-text-faint">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-pos' : 'bg-neg'}`} />
            {connected ? 'live' : 'stream offline'}
          </span>
        }
      />

      <QueryBoundary query={stats} skeletonRows={4}>
        {(s) => (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard label="Failed payments" value={s.total_failed} tone="muted"
              sub={`${s.soft} soft · ${s.hard} hard`} />
            <KpiCard label="Recovery rate" value={pct(s.recovery_rate_pct)} tone="pos"
              sub="of soft declines · 45.5% untimed baseline" />
            <KpiCard label="Revenue recovered" value={inr(s.revenue_recovered_inr)} tone="accent"
              sub={`${s.recovered} payments via recovery links`} />
            <QueryBoundary query={fines} skeletonRows={2}>
              {(f) => (
                <KpiCard label="Fines avoided" value={inr(f.fines_avoided_inr, { decimals: true })} tone="warn"
                  sub={`${f.blocked_hard_declines} hard retries never fired`} />
              )}
            </QueryBoundary>
          </div>
        )}
      </QueryBoundary>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <QueryBoundary query={stats} skeletonRows={4}>
          {(s) => (
            <Card>
              <CardTitle>Hard declines — never retried</CardTitle>
              {s.hard_decline_list.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-text-muted">No hard declines yet.</p>
              ) : (
                <Table head={['Payment', 'Reason', 'Amount']}>
                  {s.hard_decline_list.slice(0, 6).map((h) => (
                    <Tr key={h.payment_id} onClick={() => {}} >
                      <Td mono>
                        <Link className="text-accent hover:underline" to={`/payment/${h.payment_id}`}>
                          {h.payment_id.slice(0, 18)}…
                        </Link>
                      </Td>
                      <Td>{h.reason}</Td>
                      <Td mono>{inr(h.amount_inr)}</Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>
          )}
        </QueryBoundary>

        <QueryBoundary query={stats} skeletonRows={4}>
          {(s) => (
            <Card>
              <CardTitle>Rail split</CardTitle>
              {Object.entries(s.rail_split).map(([rail, n]) => (
                <div key={rail} className="flex items-baseline justify-between border-b border-border py-2 last:border-0">
                  <span className="text-[13px] uppercase text-text-muted">{rail}</span>
                  <span className="font-mono text-sm tabular-nums">{n}</span>
                </div>
              ))}
              {Object.keys(s.rail_split).length === 0 && (
                <p className="py-6 text-center text-[13px] text-text-muted">No payments yet.</p>
              )}
            </Card>
          )}
        </QueryBoundary>

        <Card>
          <CardTitle>Live activity</CardTitle>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {events.length === 0 && (
              <p className="py-6 text-center text-[13px] text-text-muted">
                Waiting for events — fire the simulator or a webhook.
              </p>
            )}
            {[...events].reverse().map((ev, i) => (
              <div key={`${ev.ts}-${i}`} className="flex items-center justify-between gap-2 rounded-sm bg-bg-subtle px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <AuditActionBadge action={ev.type} />
                  <Link to={`/payment/${ev.payment_id}`} className="truncate font-mono text-[11px] text-text-muted hover:text-accent">
                    {ev.payment_id}
                  </Link>
                </div>
                <span className="shrink-0 text-[10px] text-text-faint">{ago(ev.ts)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
