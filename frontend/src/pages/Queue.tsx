import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Play, XCircle } from 'lucide-react'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { inr, pct, dt, ago } from '../lib/format'
import { Card, CardTitle, PageHeader, Table, Td, Tr, Button } from '../components/common/primitives'
import { QueryBoundary, EmptyState } from '../components/common/states'
import { ClassPill, RailPill } from '../components/common/badges'

export default function Queue() {
  const qc = useQueryClient()
  const stats = useQuery({ queryKey: qk.stats('all'), queryFn: () => api.stats() })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['stats'] })

  const force = useMutation({ mutationFn: api.forceRetry, onSuccess: invalidate })
  const cancel = useMutation({ mutationFn: api.cancelRetry, onSuccess: invalidate })

  return (
    <>
      <PageHeader
        title="Live Queue"
        sub="Soft declines with a scheduled recovery attempt — force-fire or cancel any of them"
      />
      <QueryBoundary query={stats} skeletonRows={6} empty={(s) => s.pending_retries.length === 0}>
        {(s) => (
          <Card>
            <CardTitle action={<span className="text-[12px] text-text-faint">{s.pending_retries.length} pending</span>}>
              Pending retries
            </CardTitle>
            <Table head={['Payment', 'Amount', 'Class', 'Rail', 'Retry at', 'Conf.', 'Top signals', '']}>
              {s.pending_retries.map((p) => (
                <Tr key={p.payment_id}>
                  <Td mono>
                    <Link className="text-accent hover:underline" to={`/payment/${p.payment_id}`}>
                      {p.payment_id.slice(0, 20)}…
                    </Link>
                  </Td>
                  <Td mono>{inr(p.amount_inr)}</Td>
                  <Td><ClassPill value="soft" /></Td>
                  <Td><RailPill value={p.chosen_rail} /></Td>
                  <Td>
                    <div>{ago(p.retry_at)}</div>
                    <div className="text-[11px] text-text-faint">{dt(p.retry_at)}</div>
                  </Td>
                  <Td mono>{pct(p.confidence != null ? p.confidence * 100 : null)}</Td>
                  <Td>
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {p.top_features.slice(0, 3).map(([name]) => (
                        <span key={name} className="rounded-sm bg-surface-hover px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                          {name}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="primary" disabled={force.isPending}
                        onClick={() => force.mutate(p.payment_id)}>
                        <Play className="h-3.5 w-3.5" /> Fire now
                      </Button>
                      <Button variant="danger" disabled={cancel.isPending}
                        onClick={() => cancel.mutate(p.payment_id)}>
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Table>
            {s.pending_retries.length === 0 && <EmptyState message="Nothing queued — every soft decline is resolved." />}
          </Card>
        )}
      </QueryBoundary>
    </>
  )
}
