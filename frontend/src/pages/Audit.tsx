import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { dt } from '../lib/format'
import { Card, CardTitle, PageHeader, Table, Td, Tr, Button } from '../components/common/primitives'
import { QueryBoundary, EmptyState } from '../components/common/states'
import { AuditActionBadge, KNOWN_AUDIT_ACTIONS, auditLabel } from '../components/common/badges'
import { cn } from '../lib/utils'

const PAGE_SIZE = 30

export default function Audit() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [paymentId, setPaymentId] = useState('')

  const filters = { page, limit: PAGE_SIZE, action: action || undefined, payment_id: paymentId || undefined }
  const audit = useQuery({ queryKey: qk.audit(filters), queryFn: () => api.audit(filters) })

  return (
    <>
      <PageHeader title="Audit Trail" sub="Every decision the agent ever made, in order. This is the proof that nothing happens silently." />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1) }}
            className="rounded-sm border border-border bg-bg-subtle px-2.5 py-1.5 text-[13px] text-text outline-none focus:border-accent"
          >
            <option value="">All actions</option>
            {KNOWN_AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>{auditLabel(a)}</option>
            ))}
          </select>
          <input
            value={paymentId}
            onChange={(e) => { setPaymentId(e.target.value.trim()); setPage(1) }}
            placeholder="Filter by payment_id…"
            className="w-72 rounded-sm border border-border bg-bg-subtle px-2.5 py-1.5 font-mono text-[12px] text-text outline-none placeholder:text-text-faint focus:border-accent"
          />
          {(action || paymentId) && (
            <Button variant="ghost" onClick={() => { setAction(''); setPaymentId(''); setPage(1) }}>
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      <QueryBoundary query={audit} skeletonRows={8} empty={(d) => d.rows.length === 0}>
        {(d) => (
          <Card>
            <CardTitle
              action={
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-text-faint">page {d.page}</span>
                  <Button variant="ghost" disabled={d.page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" disabled={d.rows.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              }
            >
              Decision log
            </CardTitle>
            {d.rows.length === 0 ? (
              <EmptyState message="No audit rows match these filters." />
            ) : (
              <Table head={['When', 'Payment', 'Action', 'Detail']}>
                {d.rows.map((row) => (
                  <Tr key={row.id}>
                    <Td className="whitespace-nowrap text-text-muted">{dt(row.ts)}</Td>
                    <Td mono>
                      {row.payment_id === 'system' ? (
                        <span className="text-text-faint">system</span>
                      ) : (
                        <Link className="text-accent hover:underline" to={`/payment/${row.payment_id}`}>
                          {row.payment_id.slice(0, 22)}…
                        </Link>
                      )}
                    </Td>
                    <Td><AuditActionBadge action={row.action} /></Td>
                    <Td className={cn('max-w-md font-mono text-[11px] text-text-muted')}>{row.detail}</Td>
                  </Tr>
                ))}
              </Table>
            )}
          </Card>
        )}
      </QueryBoundary>
    </>
  )
}
