import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Play, XCircle } from 'lucide-react'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { inr, dt } from '../lib/format'
import { Card, CardTitle, PageHeader, Button, StatRow } from '../components/common/primitives'
import { QueryBoundary } from '../components/common/states'
import { ClassPill, RailPill, AuditActionBadge } from '../components/common/badges'

const FIELD_LABELS: Record<string, string> = {
  order_id: 'Order', method: 'Method', card_network: 'Card network', card_type: 'Card type',
  card_issuer: 'Bank', card_iin: 'Card ID (IIN)', credential: 'Card credential', error_source: 'Where it failed',
  error_step: 'At which step', error_code: 'Error code', international: 'International card',
  attempts: 'Attempts so far', nudge_channel: 'Reminder channel',
}

export default function PaymentDetail() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const detail = useQuery({ queryKey: qk.payment(id), queryFn: () => api.payment(id) })
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.payment(id) })
  const force = useMutation({ mutationFn: () => api.forceRetry(id), onSuccess: invalidate })
  const cancel = useMutation({ mutationFn: () => api.cancelRetry(id), onSuccess: invalidate })

  return (
    <>
      <PageHeader
        title="Payment detail"
        sub={id}
        action={
          <div className="flex gap-2">
            <Link to="/queue" className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-[13px] text-text-muted hover:bg-surface-hover">
              <ArrowLeft className="h-3.5 w-3.5" /> Queue
            </Link>
            <Button variant="primary" disabled={force.isPending} onClick={() => force.mutate()}>
              <Play className="h-3.5 w-3.5" /> Force retry
            </Button>
            <Button variant="danger" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        }
      />

      <QueryBoundary query={detail} skeletonRows={8}>
        {(d) => {
          const ev = d.event
          return (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardTitle>The payment</CardTitle>
                <StatRow label="Amount" value={inr(Number(ev.amount_paise ?? 0), { from: 'paise' })} />
                <StatRow label="Failure type" value={<ClassPill value={String(ev.classification ?? '')} />} />
                <StatRow label="Reason" value={String(ev.classify_reason ?? '—')} />
                <StatRow label="Error reason" value={String(ev.error_reason ?? '—')} />
                <StatRow label="Payment method" value={<RailPill value={String(ev.chosen_rail ?? ev.method ?? '')} />} />
                <StatRow label="Retry scheduled for" value={dt(String(ev.retry_at ?? ''))} />
                <StatRow label="Money recovered" value={ev.recovered ? `yes · ${dt(String(ev.recovered_at ?? ''))}` : 'not yet'}
                  tone={ev.recovered ? 'pos' : undefined} />
                {Object.entries(FIELD_LABELS).map(([k, label]) =>
                  ev[k] != null && ev[k] !== '' ? (
                    <StatRow key={k} label={label} value={String(ev[k])} />
                  ) : null,
                )}
                {ev.payment_link_url != null && (
                  <StatRow label="Payment link" value={
                    <a className="text-accent hover:underline" href={String(ev.payment_link_url)} target="_blank" rel="noreferrer">
                      {String(ev.payment_link_url)}
                    </a>
                  } />
                )}
              </Card>

              <Card className="lg:col-span-1">
                <CardTitle>Previous failures on this order</CardTitle>
                {d.decline_history.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-text-muted">Single decline on this order.</p>
                ) : (
                  <ol className="space-y-2">
                    {d.decline_history.map((h, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xs bg-bg-subtle px-3 py-2">
                        <span className="font-mono text-[12px]">{h.error_reason ?? 'unknown'}</span>
                        <span className="text-[11px] text-text-faint">{dt(h.created_at)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              <Card className="lg:col-span-1">
                <CardTitle action={<span className="text-[12px] text-text-faint">{d.audit.length} rows</span>}>
                  What the agent did
                </CardTitle>
                <div className="max-h-[28rem] space-y-1.5 overflow-y-auto">
                  {d.audit.map((row) => (
                    <div key={row.id} className="rounded-xs bg-bg-subtle px-2.5 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <AuditActionBadge action={row.action} />
                        <span className="text-[10px] text-text-faint">{dt(row.ts)}</span>
                      </div>
                      {row.detail && <p className="mt-1 font-mono text-[11px] leading-relaxed text-text-muted">{row.detail}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )
        }}
      </QueryBoundary>
    </>
  )
}
