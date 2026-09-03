import { Printer, TrendingUp, ShieldCheck, DollarSign, Sparkles } from 'lucide-react'
import { Modal } from './Modal'
import { inr, pct } from '../../lib/format'
import { sound } from '../../lib/sound'

interface ExecutiveBoardModalProps {
  isOpen: boolean
  onClose: () => void
  totalGmvInr?: number
  recoveredGmvInr?: number
  recoveryRatePct?: number
  finesAvoidedInr?: number
  messagingSpendInr?: number
  roiMultiple?: number
}

export function ExecutiveBoardModal({
  isOpen,
  onClose,
  recoveredGmvInr = 284000,
  recoveryRatePct = 61.1,
  finesAvoidedInr = 720,
  messagingSpendInr = 9.8,
  roiMultiple = 2752,
}: ExecutiveBoardModalProps) {
  const handlePrint = () => {
    sound.click()
    window.print()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Executive Board & CFO Brief"
      className="max-w-3xl"
    >
      <div className="space-y-6 pt-2 text-xs">
        <p className="text-[11px] text-text-muted">
          Primary-source unit economics, recovery lift, and regulatory fine shield breakdown for executive presentation.
        </p>
        {/* Executive Summary Header */}
        <div className="rounded-2xl border border-copper/40 bg-gradient-to-r from-copper/15 via-surface to-copper/5 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-copper flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Razorpay Autonomous Recovery Agent</span>
            </span>
            <span className="text-[11px] text-text-muted font-mono">Q3 Performance Snapshot</span>
          </div>
          <h3 className="font-serif text-lg font-bold text-paper">
            Net Revenue Impact & Regulatory Shield Audit
          </h3>
          <p className="text-text-muted leading-relaxed text-[11px]">
            The autonomous recovery engine replaced static 24-hour retries with compliance-bounded 240-hour ML timing, multi-rail UPI routing, and bank downtime hold queues.
          </p>
        </div>

        {/* 4 Core Financial Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-carbon p-3.5 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
              Recovered GMV
            </span>
            <div className="font-serif text-2xl font-bold text-paper">
              {inr(recoveredGmvInr)}
            </div>
            <div className="text-[10px] text-pos font-medium">Direct merchant bank credit</div>
          </div>

          <div className="rounded-xl border border-border bg-carbon p-3.5 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
              ML Recovery Rate
            </span>
            <div className="font-serif text-2xl font-bold text-copper">
              {pct(recoveryRatePct)}
            </div>
            <div className="text-[10px] text-copper font-medium">+15.6 pts over 24h baseline</div>
          </div>

          <div className="rounded-xl border border-border bg-carbon p-3.5 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
              Fines Shielded
            </span>
            <div className="font-serif text-2xl font-bold text-paper">
              {inr(finesAvoidedInr)}
            </div>
            <div className="text-[10px] text-pos font-medium">Visa/Mastercard penalties</div>
          </div>

          <div className="rounded-xl border border-pos/40 bg-pos/10 p-3.5 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-pos font-semibold">
              ROI Multiple
            </span>
            <div className="font-serif text-2xl font-bold text-paper">
              {roiMultiple.toLocaleString()}×
            </div>
            <div className="text-[10px] text-pos font-medium">On {inr(messagingSpendInr)} WhatsApp API spend</div>
          </div>
        </div>

        {/* 3 Strategic Findings for the Board */}
        <div className="space-y-2.5">
          <span className="font-semibold text-paper uppercase tracking-wider text-xs">
            Strategic Executive Findings
          </span>

          <div className="space-y-2">
            <div className="rounded-xl border border-border bg-onyx p-3 flex items-start gap-2.5">
              <TrendingUp className="h-4 w-4 text-copper shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-paper">1. Payday Horizon Timing Advantage (+15.6 pts Lift)</span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Over 60% of soft insufficient-fund declines recover between Day 1 and Day 7. Standard 24h retries fail because the customer has not received their salary credit batch.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-onyx p-3 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-pos shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-paper">2. Zero Regulatory Penalties Incurred</span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Re-attempting permanent card declines incurs mandatory card network penalties ($0.10 domestic / $0.25 cross-border per attempt). The agent strictly enforces Visa Category-1 halts and routes to UPI Autopay.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-onyx p-3 flex items-start gap-2.5">
              <DollarSign className="h-4 w-4 text-copper shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-paper">3. Unit Economics Protected via EV Gating</span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  The engine evaluates <code>EV = p × Amount - ChannelCost</code>. Micro-transactions with low recovery probabilities are automatically skipped rather than burning ₹0.35 WhatsApp fees.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-[11px] text-text-faint">
            Generated autonomously · Zero PII data retained
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-copper/60 bg-copper px-4 py-2 font-semibold text-obsidian hover:bg-copper-hover transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Executive Report</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}
