import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download, Sparkles, Filter, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { dt } from '../lib/format'
import { Card, CardTitle, PageHeader, Table, Td, Tr, Button } from '../components/common/primitives'
import { QueryBoundary, EmptyState } from '../components/common/states'
import { AuditActionBadge, KNOWN_AUDIT_ACTIONS, auditLabel } from '../components/common/badges'
import { CopyId } from '../components/common/CopyId'
import { exportCsv } from '../lib/exportCsv'
import { Modal } from '../components/common/Modal'
import { DecisionCard } from '../components/common/DecisionCard'
import { GlowBackdrop } from '../components/reactbits/GlowBackdrop'
import { SpotlightCard } from '../components/reactbits/SpotlightCard'
import { sound } from '../lib/sound'
import { cn } from '../lib/utils'

const PAGE_SIZE = 30

export default function Audit() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [paymentId, setPaymentId] = useState('')

  const filters = { page, limit: PAGE_SIZE, action: action || undefined, payment_id: paymentId || undefined }
  const audit = useQuery({ queryKey: qk.audit(filters), queryFn: () => api.audit(filters) })
  const insights = useQuery({ queryKey: qk.insights(), queryFn: () => api.insights(), staleTime: 5 * 60 * 1000 })

  // Drill-down decision modal
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const paymentDetail = useQuery({
    queryKey: qk.payment(selectedPaymentId || ''),
    queryFn: () => api.payment(selectedPaymentId || ''),
    enabled: Boolean(selectedPaymentId),
  })

  const handleExportCsv = () => {
    if (!audit.data?.rows) return
    exportCsv(
      `audit_trail_page_${page}`,
      [
        { key: 'ts', label: 'Timestamp', format: (v) => dt(String(v)) },
        { key: 'payment_id', label: 'Payment ID' },
        { key: 'action', label: 'Action', format: (v) => auditLabel(String(v)) },
        { key: 'detail', label: 'Details' },
      ],
      audit.data.rows
    )
  }

  return (
    <div className="relative space-y-6 max-w-7xl mx-auto pb-12">
      <GlowBackdrop color="copper" />

      <PageHeader
        title="Decision Log & AI Insights"
        sub="Every single decision the agent made is logged here. Click any payment to see exactly why the agent chose to retry, block, or skip it."
        action={
          <Button
            variant="default"
            onClick={handleExportCsv}
            disabled={!audit.data?.rows?.length}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV (Page {page})</span>
          </Button>
        }
      />

      {/* 1. Autonomous AI Aggregate Insights */}
      <div id="insights" className="scroll-mt-6">
        <QueryBoundary query={insights} skeletonRows={3}>
          {(d) => (
            <Card className="relative overflow-hidden p-6 border border-copper/40 bg-gradient-to-r from-copper/10 via-surface to-copper/5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between border-b border-border/60 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-copper" />
                  <h3 className="font-serif text-base font-bold text-paper">
                    Autonomous Business Insights (Zero PII Aggregation)
                  </h3>
                </div>
                <span className="text-[11px] text-text-faint font-mono bg-onyx px-2.5 py-0.5 rounded-full border border-border/50">
                  Engine: {d.generated_by}
                </span>
              </div>

              <div className="grid gap-3.5 md:grid-cols-3">
                {d.insights.map((ins, i) => (
                  <SpotlightCard
                    key={i}
                    className="p-4 space-y-2 border border-border/80 bg-carbon"
                    spotlightColor="rgba(204, 145, 102, 0.15)"
                  >
                    <p className="text-xs leading-relaxed text-bone font-sans">{ins.finding}</p>
                    <p className="font-mono text-[10px] text-copper font-semibold">
                      source: {ins.source}
                    </p>
                  </SpotlightCard>
                ))}
              </div>
            </Card>
          )}
        </QueryBoundary>
      </div>

      {/* 2. Audit Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            <Filter className="h-3.5 w-3.5 text-copper" />
            <span>Filters:</span>
          </div>

          <select
            value={action}
            onChange={(e) => {
              sound.click()
              setAction(e.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-border bg-carbon px-3 py-1.5 text-xs text-paper outline-none focus:border-copper cursor-pointer"
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
            className="w-72 rounded-xl border border-border bg-carbon px-3 py-1.5 font-mono text-xs text-paper outline-none placeholder:text-text-faint focus:border-copper"
          />

          {(action || paymentId) && (
            <Button
              variant="ghost"
              onClick={() => {
                sound.click()
                setAction('')
                setPaymentId('')
                setPage(1)
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {/* 3. Decision Log Table */}
      <QueryBoundary query={audit} skeletonRows={8} empty={(d) => d.rows.length === 0}>
        {(d) => (
          <Card className="p-6">
            <CardTitle
              action={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted font-mono font-semibold">Page {d.page}</span>
                  <Button
                    variant="ghost"
                    disabled={d.page <= 1}
                    onClick={() => {
                      sound.click()
                      setPage((p) => p - 1)
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={d.rows.length < PAGE_SIZE}
                    onClick={() => {
                      sound.click()
                      setPage((p) => p + 1)
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              }
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-copper" />
                <span>Immutable Agent Action & Decision Log</span>
              </div>
            </CardTitle>
            {d.rows.length === 0 ? (
              <EmptyState message="No audit rows match the specified filters." />
            ) : (
              <Table head={['Timestamp', 'Payment ID / Order', 'Action Taken', 'Decision Detail']}>
                {d.rows.map((row) => (
                  <Tr key={row.id}>
                    <Td className="whitespace-nowrap text-text-muted font-mono">{dt(row.ts)}</Td>
                    <Td mono>
                      {row.payment_id === 'system' ? (
                        <span className="text-text-faint font-mono text-[11px]">System Event</span>
                      ) : (
                        <CopyId
                          id={row.payment_id}
                          truncate={18}
                          linkTo={`/payment/${row.payment_id}`}
                          showDecisionAction
                          onViewDecision={(id) => setSelectedPaymentId(id)}
                        />
                      )}
                    </Td>
                    <Td><AuditActionBadge action={row.action} /></Td>
                    <Td className={cn('max-w-md font-mono text-[11px] text-text-muted leading-relaxed')}>
                      {row.detail}
                    </Td>
                  </Tr>
                ))}
              </Table>
            )}
          </Card>
        )}
      </QueryBoundary>

      {/* Decision Card Drill-down Modal */}
      <Modal
        isOpen={Boolean(selectedPaymentId)}
        onClose={() => setSelectedPaymentId(null)}
        title="Agent Decision Breakdown"
        className="max-w-4xl"
      >
        {paymentDetail.isLoading ? (
          <div className="py-8 text-center text-xs text-text-muted">Loading payment details…</div>
        ) : paymentDetail.data?.event ? (
          <DecisionCard
            event={paymentDetail.data.event}
            audit={paymentDetail.data.audit}
            showFullBrain={true}
          />
        ) : (
          <div className="py-8 text-center text-xs text-neg">Could not load payment.</div>
        )}
      </Modal>
    </div>
  )
}
