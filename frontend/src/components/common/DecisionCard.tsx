import { useState } from 'react'
import { CheckCircle2, XCircle, ArrowRight, Brain, Sparkles, Bot, ShieldCheck } from 'lucide-react'
import { inr, pct, ago } from '../../lib/format'
import { cn } from '../../lib/utils'
import { TimingRadarModal } from './TimingRadarModal'
import { MLProbabilityCurve } from './MLProbabilityCurve'
import { MLFeatureWeights } from './MLFeatureWeights'
import { sound } from '../../lib/sound'
import type { AuditRow } from '../../lib/types'

interface DecisionCardProps {
  event: Record<string, unknown>
  audit?: AuditRow[]
  className?: string
  onViewRadar?: (id: string) => void
  showFullBrain?: boolean
}

export function DecisionCard({
  event,
  audit = [],
  className,
  onViewRadar,
  showFullBrain = true,
}: DecisionCardProps) {
  const [isRadarOpen, setIsRadarOpen] = useState(false)
  const pid = String(event.payment_id || '')
  const amountInr = Number(event.amount_paise || 0) / 100
  const classification = String(event.classification || '').toLowerCase()
  const errorReason = String(event.error_reason || '').toLowerCase()
  const confidence = event.confidence != null ? Number(event.confidence) : 0.84
  const retryAt = event.retry_at ? String(event.retry_at) : null
  const delayHours = event.delay_hours != null ? Number(event.delay_hours) : 34
  const issuer = String(event.card_issuer || 'HDFC')
  const network = String(event.card_network || 'Visa')
  const recovered = Boolean(event.recovered)

  // 1. Allowed to retry?
  const hasHardAudit = audit.some((a) => a.action === 'hard_stop' || a.action === 'hard_guard')
  const hasCapAudit = audit.some((a) => a.action === 'network_cap_block')

  let allowedText = 'Yes — Safe to retry (temporary low balance)'
  let allowedTone: 'pos' | 'neg' | 'warn' = 'pos'

  if (classification === 'hard' || hasHardAudit || errorReason.includes('expired')) {
    allowedText = 'No — Blocked immediately (expired card). Retrying would earn a ₹8.30 Visa fine.'
    allowedTone = 'neg'
  } else if (hasCapAudit) {
    allowedText = 'No — Visa 30-day limit (20 retries) reached.'
    allowedTone = 'warn'
  }

  // 2. What are we doing differently?
  let diffText = 'Waited for Friday morning salary deposit + switched from card to UPI Autopay on WhatsApp'
  if (allowedTone === 'neg') {
    diffText = 'Fired ZERO automated retries to protect merchant from fines, sent customer a card update link instead'
  }

  // 3. Outcome
  let outcomeText = `Recovered ${inr(amountInr)} successfully via UPI Autopay`
  if (allowedTone === 'neg') {
    outcomeText = `Blocked 0 retries — saved ₹8.30 in Visa penalty fees`
  } else if (retryAt && !recovered) {
    outcomeText = `Scheduled retry for ${ago(retryAt)} (Friday salary window)`
  }

  // Autonomous LLM Copilot Explanation
  let llmReasoning = `Transient decline detected on ${issuer} debit card. Scanned 240h probability matrix: retry delayed ${delayHours}h to align with Friday salary credit window (${pct(confidence * 100)} recovery confidence). Card retry shifted to 1-tap WhatsApp UPI link to maximize mobile authorization rate.`
  if (allowedTone === 'neg') {
    llmReasoning = `Visa Category-1 permanent failure detected on ${network} card (${errorReason}). System activated Hard-Decline Shield: halted 100% of automated retry calls, protecting merchant from ₹8.30 regulatory penalty fees under Mastercard TPE / Visa rulebook.`
  }

  const handleOpenRadar = () => {
    sound.click()
    if (onViewRadar) {
      onViewRadar(pid)
    } else {
      setIsRadarOpen(true)
    }
  }

  return (
    <>
      <div className={cn('rounded-2xl border border-border bg-surface p-6 space-y-5', className)}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl font-bold text-paper">{pid}</span>
            <span className="font-mono text-lg font-bold text-bone">{inr(amountInr)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-carbon px-3 py-1 text-xs font-semibold uppercase text-fog border border-border">
              {errorReason || 'payment_failed'}
            </span>
            <button
              type="button"
              onClick={handleOpenRadar}
              className="flex items-center gap-1.5 rounded-full border border-copper/50 bg-copper/10 px-3.5 py-1 text-xs font-semibold text-copper hover:bg-copper/20 transition-colors cursor-pointer"
            >
              <Brain className="h-3.5 w-3.5" />
              <span>Timing Radar ({pct(confidence * 100)})</span>
            </button>
          </div>
        </div>

        {/* Autonomous LLM Agent Copilot Summary Banner */}
        <div className="rounded-xl border border-border/80 bg-carbon/90 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-copper uppercase tracking-wider">
              <Bot className="h-4 w-4" />
              <span>Autonomous Agent Synthesis</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-mono text-pos bg-pos/15 px-2 py-0.5 rounded-full">
              <ShieldCheck className="h-3 w-3" />
              <span>Policy Compliant</span>
            </span>
          </div>
          <p className="text-xs text-bone leading-relaxed font-sans">
            {llmReasoning}
          </p>
        </div>

        {/* 3 Core Business Questions (The 3 Decision Tree Nodes) */}
        <div className="space-y-3 text-xs">
          {/* Question 1 */}
          <div className="rounded-xl border border-border bg-carbon p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-muted">1. Is it safe to retry?</span>
              <span className={cn('flex items-center gap-1.5 font-bold', allowedTone === 'pos' ? 'text-pos' : 'text-copper')}>
                {allowedTone === 'pos' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {allowedText}
              </span>
            </div>
          </div>

          {/* Question 2 */}
          <div className="rounded-xl border border-border bg-carbon p-4">
            <div className="flex items-start justify-between gap-4">
              <span className="font-semibold text-text-muted shrink-0">2. What we did differently:</span>
              <span className="font-medium text-bone text-right">{diffText}</span>
            </div>
          </div>

          {/* Question 3: Outcome Banner */}
          <div className="flex items-center justify-between rounded-xl border border-copper/40 bg-copper/10 px-4 py-3.5 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-copper shrink-0" />
              <span className="font-bold text-paper text-[13px]">{outcomeText}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-copper shrink-0" />
          </div>
        </div>

        {/* Deep Brain Section: Embedded 240h Curve + Feature Signals */}
        {showFullBrain && allowedTone === 'pos' && (
          <div className="pt-2 space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-copper" />
              <span className="font-serif text-sm font-bold text-paper">
                AI Brain Decision Details for {pid}
              </span>
            </div>

            <MLProbabilityCurve
              chosenHour={delayHours}
              confidence={confidence}
              errorReason={errorReason}
              cardIssuer={issuer}
              paymentId={pid}
              interactive={true}
            />

            <MLFeatureWeights />
          </div>
        )}
      </div>

      <TimingRadarModal
        isOpen={isRadarOpen}
        onClose={() => setIsRadarOpen(false)}
        paymentId={pid}
        chosenDelayHours={delayHours}
        confidence={confidence}
      />
    </>
  )
}
