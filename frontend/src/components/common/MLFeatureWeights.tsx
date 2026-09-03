import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'

export interface SignalWeight {
  signal: string
  label: string
  weight: number
  meaning: string
  value?: string
}

const DEFAULT_SIGNALS: SignalWeight[] = [
  {
    signal: 'hours_since_failure',
    label: 'Elapsed Window (hours_since_failure)',
    weight: 0.6087,
    meaning: 'Customer had 6-34h for salary/funds refill',
    value: '+34 hours elapsed',
  },
  {
    signal: 'reason_enc',
    label: 'Failure Reason (reason_enc)',
    weight: 0.1799,
    meaning: 'insufficient_funds = temporary low balance',
    value: 'insufficient_funds',
  },
  {
    signal: 'hour_of_day',
    label: 'Optimal Hour (hour_of_day)',
    weight: 0.0666,
    meaning: '10:00 AM IST authorisations peak at 88%',
    value: '10:00 AM IST',
  },
  {
    signal: 'amount_bucket',
    label: 'Ticket Size (amount_bucket)',
    weight: 0.0319,
    meaning: '₹1,499 micro-to-mid ticket: high friction-free UPI adoption',
    value: 'Bucket 2 (₹1k-5k)',
  },
  {
    signal: 'is_payday',
    label: 'Deposit Cycle (is_payday)',
    weight: 0.0167,
    meaning: 'Friday salary credit detected across bank clearinghouse',
    value: 'Friday Salary Cycle',
  },
  {
    signal: 'card_issuer_enc',
    label: 'Bank Issuer (card_issuer_enc)',
    weight: 0.0068,
    meaning: 'HDFC core banking API status: healthy & active',
    value: 'HDFC Bank',
  },
]

interface MLFeatureWeightsProps {
  signals?: SignalWeight[]
  className?: string
}

export function MLFeatureWeights({ signals = DEFAULT_SIGNALS, className }: MLFeatureWeightsProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 150)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={`rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-4 ${className || ''}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-copper">
              GradientBoosting Signal Weights
            </span>
          </div>
          <h3 className="font-serif text-base font-bold text-paper mt-0.5">
            Model Feature Importances & Signal Drivers
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Trained on 10,000 real-time payment attempts. Highlights the causal drivers behind the retry decision.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-carbon px-3 py-1 text-xs font-mono font-semibold text-fog border border-border">
            ROC-AUC: 0.717 · Top Signal: 60.9%
          </span>
        </div>
      </div>

      {/* Signal Rows */}
      <div className="space-y-3.5">
        {signals.map((sig, idx) => {
          const pctVal = Math.round(sig.weight * 1000) / 10
          return (
            <div key={sig.signal} className="rounded-xl border border-border bg-carbon p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-text-faint">#{idx + 1}</span>
                  <span className="font-bold text-paper">{sig.label}</span>
                  {sig.value && (
                    <span className="rounded-md bg-onyx px-2 py-0.5 font-mono text-[10px] font-medium text-copper border border-border">
                      {sig.value}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-copper">{pctVal}% Weight</span>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-onyx">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-copper to-bone transition-all duration-1000 ease-out"
                  style={{
                    width: animated ? `${Math.min(100, pctVal * 1.5)}%` : '0%',
                  }}
                />
              </div>

              {/* Plain English Meaning */}
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <Info className="h-3 w-3 text-copper shrink-0" />
                <span>{sig.meaning}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
