import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { dt, ago } from '../lib/format'
import { Card, CardTitle, PageHeader, Table, Td, Tr } from '../components/common/primitives'
import { QueryBoundary, EmptyState } from '../components/common/states'

export default function Downtime() {
  const board = useQuery({
    queryKey: qk.downtime(),
    queryFn: () => api.downtime(),
    refetchInterval: 5000,
  })

  return (
    <>
      <PageHeader
        title="Downtime Board"
        sub="When a bank or UPI service goes down, retrying is pointless — so the agent parks those payments and retries them once the service is back."
      />
      <QueryBoundary query={board} skeletonRows={4}>
        {(b) => (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle action={<span className="text-[12px] text-text-faint">{b.active_downtimes.length} active</span>}>
                Outages happening now
              </CardTitle>
              {b.active_downtimes.length === 0 ? (
                <EmptyState message="No active outages — all rails healthy." />
              ) : (
                <Table head={['Method', 'Issuer', 'Started', 'Status']}>
                  {b.active_downtimes.map((d) => (
                    <Tr key={d.id}>
                      <Td>{d.method}</Td>
                      <Td mono>{d.issuer || '—'}</Td>
                      <Td>
                        <div>{ago(d.started_at)}</div>
                        <div className="text-[11px] text-text-faint">{dt(d.started_at)}</div>
                      </Td>
                      <Td>
                        <span className="animate-pulse rounded-sm bg-infra/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-infra">
                          {d.status}
                        </span>
                      </Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>

            <Card>
              <CardTitle action={<span className="text-[12px] text-text-faint">{b.queued_payments.length} parked</span>}>
                Payments waiting for the outage to end
              </CardTitle>
              {b.queued_payments.length === 0 ? (
                <EmptyState message="Nothing parked — failures during outages will appear here." />
              ) : (
                <Table head={['Payment', 'Method', 'Issuer', 'Queued']}>
                  {b.queued_payments.map((q) => (
                    <Tr key={q.payment_id}>
                      <Td mono>
                        <Link className="text-accent hover:underline" to={`/payment/${q.payment_id}`}>
                          {q.payment_id.slice(0, 22)}…
                        </Link>
                      </Td>
                      <Td>{q.method}</Td>
                      <Td mono>{q.issuer || '—'}</Td>
                      <Td>{ago(q.queued_at)}</Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}
      </QueryBoundary>
    </>
  )
}
