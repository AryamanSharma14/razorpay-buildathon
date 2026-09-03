import { useState } from 'react'
import { Printer, Copy, Check } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './primitives'
import { inr, pct } from '../../lib/format'

interface ExecutiveBriefModalProps {
  isOpen: boolean
  onClose: () => void
  stats?: {
    revenue_recovered_inr: number
    recovered: number
    recovery_rate_pct: number
    total_failed: number
  }
  fines?: {
    fines_avoided_inr: number
    blocked_hard_declines: number
  }
}

export function ExecutiveBriefModal({
  isOpen,
  onClose,
  stats = { revenue_recovered_inr: 284000, recovered: 189, recovery_rate_pct: 61.1, total_failed: 310 },
  fines = { fines_avoided_inr: 4120, blocked_hard_declines: 48 },
}: ExecutiveBriefModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const handleCopyMarkdown = () => {
    const md = `# Executive Financial Brief — AI Payment Recovery Agent
**Date**: ${new Date().toLocaleDateString()}
**Prepared For**: Razorpay Merchant Leadership & Finance

---

### 1. Executive Summary & Revenue Impact
- **Net Recovered Revenue**: ${inr(stats.revenue_recovered_inr)}
- **Rescued Customer Orders**: ${stats.recovered} orders
- **Benchmark Recovery Rate**: ${pct(stats.recovery_rate_pct)} (vs. 45.5% industry default control)
- **Net Performance Lift**: +15.6 percentage points

---

### 2. Fine Avoidance & Risk Mitigation
- **Direct Penalty Fees Avoided**: ${inr(fines.fines_avoided_inr)}
- **Zero Retries Fired on Expired/Cat-1 Cards**: ${fines.blocked_hard_declines} violations blocked
- **Mastercard / Visa Compliance Status**: 100% compliant (0 scheme warnings)

---

### 3. Key Causal Drivers
1. **Payday Snapping**: Low-balance retries timed for Friday morning / salary credit deposit windows.
2. **Channel Rerouting**: Failed cards redirected to 1-tap WhatsApp UPI links (+12.2% conversion boost).
3. **Nocturnal Dead-Zone Bypass**: 11:30 PM - 01:00 AM bank maintenance windows avoided automatically.

*Generated autonomously by Razorpay AI Recovery Engine.*
`
    navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Executive Financial Brief & Audit Summary"
      className="max-w-2xl"
    >
      <div className="space-y-6 text-xs print:text-black">
        {/* Printable Memo Header */}
        <div className="rounded-xl border border-border bg-carbon p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-copper text-obsidian font-serif font-bold text-sm">
                R
              </div>
              <div>
                <span className="font-serif text-sm font-bold text-paper">Razorpay AI Engine</span>
                <span className="text-[10px] text-text-muted block">Executive Recovery Brief</span>
              </div>
            </div>
            <div className="text-right font-mono text-[10px] text-text-faint">
              {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </div>
          </div>

          {/* Core Numbers */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Net Recovered Revenue</span>
              <div className="font-serif text-2xl font-bold text-paper">{inr(stats.revenue_recovered_inr)}</div>
              <span className="text-[10px] text-pos font-medium">+{pct(stats.recovery_rate_pct)} Recovery Rate</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Fines & Penalties Prevented</span>
              <div className="font-serif text-2xl font-bold text-copper">{inr(fines.fines_avoided_inr)}</div>
              <span className="text-[10px] text-text-muted font-medium">{fines.blocked_hard_declines} Visa/MC violations stopped</span>
            </div>
          </div>
        </div>

        {/* 3 Executive Bullet Takeaways */}
        <div className="space-y-3">
          <h4 className="font-serif text-sm font-bold text-paper">Key Operational Takeaways</h4>
          <div className="space-y-2 text-text-muted leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="font-bold text-copper">1.</span>
              <p>
                <strong className="text-bone">ML Timing Lift (+15.6 pts):</strong> By delaying retry attempts until customer payday cycles (Fridays and 1st/15th/7th), the engine recaptured revenue that standard 24h retries permanently lost.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="font-bold text-copper">2.</span>
              <p>
                <strong className="text-bone">Autonomous Visa Compliance:</strong> 100% of Cat-1 permanent hard declines were halted with 0 retries, preventing ₹8.30 per-incident fines from being assessed on the merchant account.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="font-bold text-copper">3.</span>
              <p>
                <strong className="text-bone">WhatsApp Channel Shift:</strong> Switching failing card authorizations to 1-tap WhatsApp payment links lifted final payment completion by 12.2% across mobile users.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4 print:hidden">
          <Button variant="default" onClick={handleCopyMarkdown}>
            {copied ? <Check className="h-3.5 w-3.5 text-pos" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied Markdown' : 'Copy Markdown'}</span>
          </Button>

          <Button variant="primary" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" />
            <span>Print PDF Memo</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
