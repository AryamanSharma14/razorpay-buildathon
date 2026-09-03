import { useState } from 'react'
import { RotateCcw, CheckCircle2, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react'
import { Button } from './primitives'
import { inr, pct } from '../../lib/format'
import { cn } from '../../lib/utils'

export function SandboxPanel() {
  const [visaRules, setVisaRules] = useState(true)
  const [mlTiming, setMlTiming] = useState(true)
  const [evGate, setEvGate] = useState(true)
  const [multiRail, setMultiRail] = useState(true)

  // Simulation calculations based on 10,000 monthly failed payments (₹1 Cr GMV scale)
  const baseFailures = 10000
  const avgAmount = 1500

  // 1. Recovery Rate calculation
  let recoveryRate = 61.1 // All ON
  if (!mlTiming) recoveryRate -= 15.6 // Drops to 45.5% without ML timing
  if (!multiRail) recoveryRate -= 12.2 // Drops without UPI switch

  const recoveredCount = Math.round((baseFailures * recoveryRate) / 100)
  const revenueRecovered = recoveredCount * avgAmount

  // 2. Fines calculation
  let finesIncurred = 0
  if (!visaRules) {
    // 350 hard declines * ₹8.30 + 120 excessive retries * ₹41.50
    finesIncurred = 350 * 8.30 + 120 * 41.50 // ~₹7,885 per month
  }

  // 3. Wasted spend
  let wastedSpend = 0
  if (!evGate) {
    // Chasing 800 micro-payments with WhatsApp ₹0.35 = ₹280 lost
    wastedSpend = 800 * 0.35
  }

  const standardSpend = recoveredCount * 0.35
  const totalSpend = standardSpend + wastedSpend
  const netProfit = revenueRecovered - finesIncurred - totalSpend

  const handleResetAll = () => {
    setVisaRules(true)
    setMlTiming(true)
    setEvGate(true)
    setMultiRail(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-paper">
            What-If Policy & Engine Sandbox
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Toggle off AI and compliance safety guards to see real-time financial penalties and revenue degradation.
          </p>
        </div>

        <Button variant="default" onClick={handleResetAll} className="cursor-pointer">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset to Recommended (All Safe)</span>
        </Button>
      </div>

      {/* 4 Interactive Toggle Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Toggle 1: Visa / MC Hard Decline Guard */}
        <div
          onClick={() => setVisaRules(!visaRules)}
          className={cn(
            'cursor-pointer rounded-2xl border p-5 transition-all space-y-3',
            visaRules
              ? 'border-border bg-surface hover:border-steel/80'
              : 'border-neg/60 bg-neg/10 shadow-lg shadow-neg/10'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Visa / MC Safety Guard
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase',
                visaRules ? 'bg-pos/20 text-pos' : 'bg-neg/20 text-neg'
              )}
            >
              {visaRules ? 'ACTIVE' : 'OFF (PENALTY)'}
            </span>
          </div>

          <div className="font-serif text-base font-bold text-paper">
            1. Hard Decline Shield
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            {visaRules
              ? 'Blocks retries on expired cards, avoiding ₹8.30 per-incident fines.'
              : '⚠️ DISABLED: System retries expired cards. Direct Visa fines will be incurred.'}
          </p>

          <div className="text-[11px] font-mono font-semibold pt-1 border-t border-border/60">
            {visaRules ? (
              <span className="text-pos flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> ₹0 in fines
              </span>
            ) : (
              <span className="text-neg flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> +₹7,885 monthly fines
              </span>
            )}
          </div>
        </div>

        {/* Toggle 2: ML 240h Timing Engine */}
        <div
          onClick={() => setMlTiming(!mlTiming)}
          className={cn(
            'cursor-pointer rounded-2xl border p-5 transition-all space-y-3',
            mlTiming
              ? 'border-border bg-surface hover:border-steel/80'
              : 'border-copper/60 bg-copper/10 shadow-lg shadow-copper/10'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              ML Timing Engine
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase',
                mlTiming ? 'bg-copper/20 text-copper' : 'bg-carbon text-fog'
              )}
            >
              {mlTiming ? 'ACTIVE' : 'BLIND 24H'}
            </span>
          </div>

          <div className="font-serif text-base font-bold text-paper">
            2. 240-Hour ML Timing
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            {mlTiming
              ? 'Scans 240 hours and snaps retries to Friday / salary credit deposit windows.'
              : '⚠️ DISABLED: Retries fire blindly after 24h, dropping recovery by -15.6 pts.'}
          </p>

          <div className="text-[11px] font-mono font-semibold pt-1 border-t border-border/60">
            {mlTiming ? (
              <span className="text-copper flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> 61.1% recovery rate
              </span>
            ) : (
              <span className="text-text-muted flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 rotate-180 text-neg" /> 45.5% control rate
              </span>
            )}
          </div>
        </div>

        {/* Toggle 3: Multi-Rail UPI Switch */}
        <div
          onClick={() => setMultiRail(!multiRail)}
          className={cn(
            'cursor-pointer rounded-2xl border p-5 transition-all space-y-3',
            multiRail
              ? 'border-border bg-surface hover:border-steel/80'
              : 'border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/10'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Rail Routing Engine
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase',
                multiRail ? 'bg-pos/20 text-pos' : 'bg-carbon text-fog'
              )}
            >
              {multiRail ? 'UPI ENABLED' : 'CARD ONLY'}
            </span>
          </div>

          <div className="font-serif text-base font-bold text-paper">
            3. Multi-Rail UPI Switch
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            {multiRail
              ? 'Switches failing cards to 1-tap WhatsApp UPI links (+12.2% conversion boost).'
              : '⚠️ DISABLED: Re-attempts original card only; customer must re-enter card CVV.'}
          </p>

          <div className="text-[11px] font-mono font-semibold pt-1 border-t border-border/60">
            {multiRail ? (
              <span className="text-pos flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> +12.2% mobile lift
              </span>
            ) : (
              <span className="text-text-muted">Card auth only</span>
            )}
          </div>
        </div>

        {/* Toggle 4: Expected Value Gate */}
        <div
          onClick={() => setEvGate(!evGate)}
          className={cn(
            'cursor-pointer rounded-2xl border p-5 transition-all space-y-3',
            evGate
              ? 'border-border bg-surface hover:border-steel/80'
              : 'border-carbon bg-carbon/60'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Unit Economics
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase',
                evGate ? 'bg-carbon text-fog' : 'bg-neg/20 text-neg'
              )}
            >
              {evGate ? 'ACTIVE' : 'CHASE ALL'}
            </span>
          </div>

          <div className="font-serif text-base font-bold text-paper">
            4. Refuse to Chase Gate
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            {evGate
              ? 'Skips ₹0.01 micro-payments where sending a WhatsApp nudge (₹0.35) loses money.'
              : '⚠️ DISABLED: Wastes communication budget chasing uneconomic micro-orders.'}
          </p>

          <div className="text-[11px] font-mono font-semibold pt-1 border-t border-border/60">
            {evGate ? (
              <span className="text-fog">Zero wasted spend</span>
            ) : (
              <span className="text-neg">+₹280 wasted spend</span>
            )}
          </div>
        </div>
      </div>

      {/* Live Financial Outcome Banner */}
      <div className="rounded-2xl border border-border bg-carbon p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-copper">
              Projected Scale Impact (10,000 Monthly Failures / ₹1.5 Cr GMV)
            </span>
            <h3 className="font-serif text-lg font-bold text-paper mt-0.5">
              Live Projected Net Revenue
            </h3>
          </div>

          <div className="text-right">
            <div className="font-serif text-3xl font-bold text-paper">
              {inr(netProfit)}
            </div>
            <span className="text-xs text-text-muted">Net recovered into merchant bank account</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4 text-xs">
          <div className="space-y-1">
            <span className="text-text-muted">Effective Recovery Rate</span>
            <div className="font-serif text-xl font-bold text-paper">{pct(recoveryRate)}</div>
            <span className="text-[11px] text-text-muted">{recoveredCount} customer orders</span>
          </div>

          <div className="space-y-1">
            <span className="text-text-muted">Gross Recovered GMV</span>
            <div className="font-serif text-xl font-bold text-paper">{inr(revenueRecovered)}</div>
            <span className="text-[11px] text-text-muted">Avg ₹1,500 ticket</span>
          </div>

          <div className="space-y-1">
            <span className="text-text-muted">Visa / MC Penalties</span>
            <div className={cn('font-serif text-xl font-bold', finesIncurred > 0 ? 'text-neg' : 'text-pos')}>
              {inr(finesIncurred)}
            </div>
            <span className="text-[11px] text-text-muted">{finesIncurred > 0 ? 'Direct scheme fines' : '100% compliant'}</span>
          </div>

          <div className="space-y-1">
            <span className="text-text-muted">Nudge & Channel Cost</span>
            <div className="font-serif text-xl font-bold text-bone">{inr(totalSpend)}</div>
            <span className="text-[11px] text-text-muted">WhatsApp + SMS routing</span>
          </div>
        </div>
      </div>
    </div>
  )
}
