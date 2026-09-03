import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RotateCw, XCircle, ArrowLeft, Bot, CreditCard, History, ShieldCheck, ExternalLink } from 'lucide-react'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { dt, inr } from '../lib/format'
import { Card, CardTitle, PageHeader, Table, Td, Tr, Button, StatRow } from '../components/common/primitives'
import { ClassPill, RailPill } from '../components/common/badges'
import { CopyId } from '../components/common/CopyId'
import { QueryBoundary } from '../components/common/states'
import { DecisionCard } from '../components/common/DecisionCard'
import { AgentDecisionTrace } from '../components/common/AgentDecisionTrace'
import { GlowBackdrop } from '../components/reactbits/GlowBackdrop'
import { SpotlightCard } from '../components/reactbits/SpotlightCard'
import { sound } from '../lib/sound'
import { cn } from '../lib/utils'

const FIELD_LABELS: Record<string, string> = {
  card_network: 'Card Network',
  card_type: 'Card Type',
  card_issuer: 'Card Issuer',
  card_iin: 'IIN / BIN',
  international: 'International',
  vpa: 'UPI VPA',
  nudge_channel: 'Recovery Channel',
  decision_action: 'AI Agent Decision',
  decision_reasoning: 'Agent Reasoning',
  decision_confidence: 'Decision Confidence',
}

export default function PaymentDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [msg, setMsg] = useState<{ text: string; tone: 'pos' | 'neg' } | null>(null)

  const detail = useQuery({ queryKey: qk.payment(id), queryFn: () => api.payment(id), enabled: Boolean(id) })

  const force = useMutation({
    mutationFn: () => api.forceRetry(id),
    onSuccess: (r) => {
      sound.chime()
      setMsg({
        text: r.fired ? 'Retry fired immediately via Razorpay API.' : 'Retry was blocked or not scheduled.',
        tone: r.fired ? 'pos' : 'neg',
      })
      qc.invalidateQueries()
    },
    onError: (e: Error) => {
      sound.guard()
      setMsg({ text: `Failed to force retry: ${e.message}`, tone: 'neg' })
    },
  })

  const cancel = useMutation({
    mutationFn: () => api.cancelRetry(id),
    onSuccess: () => {
      sound.click()
      setMsg({ text: 'Scheduled retry cancelled.', tone: 'pos' })
      qc.invalidateQueries()
    },
    onError: (e: Error) => setMsg({ text: `Failed to cancel: ${e.message}`, tone: 'neg' }),
  })

  return (
    <div className="relative space-y-6 max-w-7xl mx-auto pb-12">
      <GlowBackdrop color="copper" />

      <PageHeader
        title={id}
        sub="Individual payment lifecycle, AI decision breakdown, decline history, and full audit trail."
        action={
          <div className="flex items-center gap-2">
            <Link to="/queue">
              <Button variant="ghost">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Queue</span>
              </Button>
            </Link>
            <Button
              variant="default"
              onClick={() => {
                sound.click()
                force.mutate()
              }}
              disabled={force.isPending}
            >
              <RotateCw className="h-3.5 w-3.5 text-copper" />
              <span>Force Retry Now</span>
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                sound.click()
                cancel.mutate()
              }}
              disabled={cancel.isPending}
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancel Retry</span>
            </Button>
          </div>
        }
      />

      <QueryBoundary query={detail} skeletonRows={8}>
        {(d) => {
          const ev = d.event
          if (!ev) {
            return (
              <Card className="p-8 text-center text-neg">
                Payment event not found in database.
              </Card>
            )
          }

          return (
            <div className="space-y-6">
              {/* 1. Prominent Decision Card with Full Brain */}
              <DecisionCard event={ev} audit={d.audit} showFullBrain={true} />

              {/* 2. Interactive Agent Decision Trace Pipeline */}
              <AgentDecisionTrace
                paymentId={id}
                amountInr={Number(ev.amount_paise ?? 0) / 100}
                reason={String(ev.error_reason || ev.classify_reason || 'insufficient_funds')}
                method={String(ev.method || 'card')}
                issuer={String(ev.card_issuer || 'HDFC')}
                network={String(ev.card_network || 'visa')}
                isHardDecline={ev.classification === 'hard' || ev.classification === 'fraud'}
                isDowntime={ev.classification === 'infrastructure'}
                selectedHour={34}
                confidencePct={Math.round(Number(ev.confidence ?? 0.84) * 100)}
                evInr={41.8}
                channelCostInr={0.35}
                channel={String(ev.chosen_rail || 'WhatsApp (1-Tap UPI)')}
                nudgeReasoning={String(ev.nudge_reasoning || 'Autonomous GradientBoosting model identified optimal salary credit window.')}
              />

              {/* 3. Three Column Breakdown */}
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="p-6 lg:col-span-1">
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-copper" />
                      <span>Payment Specifications</span>
                    </div>
                  </CardTitle>
                  <div className="space-y-1">
                    <StatRow
                      label="Payment ID"
                      value={<CopyId id={id} truncate={20} />}
                    />
                    <StatRow
                      label="Amount"
                      value={inr(Number(ev.amount_paise ?? 0), { from: 'paise' })}
                    />
                    <StatRow
                      label="Failure Category"
                      value={<ClassPill value={String(ev.classification ?? '')} />}
                    />
                    <StatRow label="Failure Reason" value={String(ev.classify_reason ?? '—')} />
                    <StatRow label="Bank Error Reason" value={String(ev.error_reason ?? '—')} />
                    <StatRow
                      label="Recovery Method"
                      value={<RailPill value={String(ev.chosen_rail ?? ev.method ?? '')} />}
                    />
                    <StatRow label="Scheduled Retry" value={dt(String(ev.retry_at ?? ''))} />
                    <StatRow
                      label="Status"
                      value={
                        ev.recovered
                          ? `✓ recovered (${dt(String(ev.recovered_at ?? ''))})`
                          : 'not recovered'
                      }
                      tone={ev.recovered ? 'pos' : undefined}
                    />
                    {Object.entries(FIELD_LABELS).map(([k, label]) =>
                      ev[k] != null && ev[k] !== '' ? (
                        <StatRow key={k} label={label} value={String(ev[k])} />
                      ) : null
                    )}
                    {ev.payment_link_url != null && (
                      <StatRow
                        label="Payment Link"
                        value={
                          <a
                            className="text-copper hover:underline inline-flex items-center gap-1 font-mono text-xs"
                            href={String(ev.payment_link_url)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span>Open Link</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        }
                      />
                    )}
                  </div>
                </Card>

                <Card className="p-6 lg:col-span-1">
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-copper" />
                      <span>Previous Failures on Order</span>
                    </div>
                  </CardTitle>
                  {!d.decline_history || d.decline_history.length === 0 ? (
                    <p className="py-8 text-center text-xs text-text-muted">
                      Single initial failure recorded for this transaction.
                    </p>
                  ) : (
                    <ol className="space-y-2">
                      {d.decline_history.map((h: { error_reason?: string; created_at?: string }, i: number) => (
                        <li
                          key={i}
                          className="flex items-center justify-between rounded-xl border border-border bg-carbon px-3.5 py-2.5 shadow-xs"
                        >
                          <span className="font-mono text-xs text-bone font-medium">
                            {h.error_reason ?? 'unknown'}
                          </span>
                          <span className="text-[10px] text-text-faint font-mono">{dt(String(h.created_at || ''))}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>

                <SpotlightCard
                  className="relative p-6 lg:col-span-1 space-y-2 overflow-hidden border border-copper/40"
                  spotlightColor="rgba(204, 145, 102, 0.18)"
                >
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-copper" />
                      <span>Autonomous Explainability</span>
                    </div>
                  </CardTitle>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Explainability features from GradientBoosting model & Autonomous AI reasoning copilot.
                  </p>
                  {ev.nudge_reasoning ? (
                    <div className="mt-3 rounded-xl border border-border bg-carbon p-3.5 text-xs">
                      <div className="font-bold text-copper flex items-center gap-1 mb-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Copilot Reasoning:</span>
                      </div>
                      <p className="text-bone leading-relaxed font-sans">{String(ev.nudge_reasoning)}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-text-faint pt-2">No custom nudge reasoning recorded.</p>
                  )}
                </SpotlightCard>
              </div>

              {/* 3. Audit Trail Table */}
              <Card className="p-6">
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-copper" />
                    <span>Audit Trail for This Transaction</span>
                  </div>
                </CardTitle>
                {d.audit.length === 0 ? (
                  <p className="py-8 text-center text-xs text-text-muted">No audit events recorded.</p>
                ) : (
                  <Table head={['Timestamp', 'Action Taken', 'Decision Detail']}>
                    {d.audit.map((a) => (
                      <Tr key={a.id}>
                        <Td mono className="text-text-muted font-mono">{dt(a.ts)}</Td>
                        <Td className="font-bold uppercase text-paper">{a.action}</Td>
                        <Td className="text-bone font-mono text-[11px] leading-relaxed">{a.detail}</Td>
                      </Tr>
                    ))}
                  </Table>
                )}
              </Card>

              {msg && (
                <div
                  className={cn(
                    'rounded-xl p-3.5 text-xs font-semibold animate-in fade-in duration-150',
                    msg.tone === 'pos' ? 'bg-pos/10 text-pos border border-pos/40' : 'bg-neg/10 text-neg border border-neg/40'
                  )}
                >
                  {msg.text}
                </div>
              )}
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}
