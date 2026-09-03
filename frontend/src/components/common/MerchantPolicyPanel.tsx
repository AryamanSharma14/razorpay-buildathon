import { useState } from 'react'
import { ShieldCheck, Moon, TrendingUp, CreditCard, Check, Sparkles } from 'lucide-react'
import { sound } from '../../lib/sound'
import { inr } from '../../lib/format'
import { useVerdict } from './VerdictBanner'

export function MerchantPolicyPanel() {
  const { showVerdict } = useVerdict()
  const [traiQuietHours, setTraiQuietHours] = useState(true)
  const [autoUpiReroute, setAutoUpiReroute] = useState(true)
  const [minOrderEv, setMinOrderEv] = useState(100)
  const [visaCapMode, setVisaCapMode] = useState<'standard' | 'conservative'>('standard')
  const [isSaved, setIsSaved] = useState(false)

  const handleSave = () => {
    sound.chime()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2500)
    showVerdict({
      type: 'recovered',
      title: 'MERCHANT POLICY UPDATED',
      detail: `New guardrails active: Quiet hours ${traiQuietHours ? 'Enforced' : 'Disabled'}, Min Order ${inr(minOrderEv)}, UPI Reroute ${autoUpiReroute ? 'Active' : 'Off'}.`,
    })
  }

  const applyPreset = (preset: 'conservative' | 'growth' | 'default') => {
    sound.click()
    if (preset === 'conservative') {
      setTraiQuietHours(true)
      setAutoUpiReroute(true)
      setMinOrderEv(250)
      setVisaCapMode('conservative')
    } else if (preset === 'growth') {
      setTraiQuietHours(false)
      setAutoUpiReroute(true)
      setMinOrderEv(50)
      setVisaCapMode('standard')
    } else {
      setTraiQuietHours(true)
      setAutoUpiReroute(true)
      setMinOrderEv(100)
      setVisaCapMode('standard')
    }
  }

  return (
    <div className="space-y-6 text-xs">
      {/* Policy Summary Card */}
      <div className="rounded-2xl border border-copper/40 bg-gradient-to-r from-copper/10 via-surface to-copper/5 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-pos" />
            <span className="font-serif text-base font-bold text-paper">
              Enterprise Merchant Guardrails & Regulatory Bounds
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">
            Configure custom risk thresholds, messaging quiet hours, and multi-rail fallback behavior.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset('conservative')}
            className="rounded-xl border border-border bg-onyx px-3 py-1.5 font-semibold text-text-muted hover:text-paper transition-colors cursor-pointer"
          >
            Bank Grade
          </button>
          <button
            type="button"
            onClick={() => applyPreset('growth')}
            className="rounded-xl border border-border bg-onyx px-3 py-1.5 font-semibold text-text-muted hover:text-paper transition-colors cursor-pointer"
          >
            High Growth
          </button>
          <button
            type="button"
            onClick={() => applyPreset('default')}
            className="rounded-xl border border-copper/50 bg-copper/15 px-3 py-1.5 font-semibold text-copper hover:bg-copper hover:text-obsidian transition-colors cursor-pointer"
          >
            Default Enterprise
          </button>
        </div>
      </div>

      {/* Grid of 4 Core Levers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lever 1: TRAI Quiet Hours */}
        <div className="rounded-2xl border border-border bg-carbon p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-copper/15 text-copper">
                <Moon className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-paper text-sm">TRAI Quiet Hours (10 PM – 8 AM)</span>
                <div className="text-[10px] text-text-muted font-mono">TCCCPR 2025 Compliance</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.click()
                setTraiQuietHours(!traiQuietHours)
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                traiQuietHours ? 'bg-pos' : 'bg-onyx border border-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  traiQuietHours ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <p className="text-[11px] text-text-muted leading-relaxed">
            Service messages scheduled between 10:00 PM and 8:00 AM are held in a quiet-hours queue and released at 8:01 AM. Prevents consumer annoyance and Indian regulatory scrutiny.
          </p>
        </div>

        {/* Lever 2: Auto-Reroute to UPI */}
        <div className="rounded-2xl border border-border bg-carbon p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pos/15 text-pos">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-paper text-sm">Auto-Reroute Card to UPI Link</span>
                <div className="text-[10px] text-text-muted font-mono">Rail Arbitrage</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.click()
                setAutoUpiReroute(!autoUpiReroute)
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                autoUpiReroute ? 'bg-pos' : 'bg-onyx border border-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoUpiReroute ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <p className="text-[11px] text-text-muted leading-relaxed">
            When a card fails due to 3DS timeout or bank limits, the recovery Payment Link pre-selects 1-Tap UPI (GPay/PhonePe/Paytm), bypassing card authorization failure repetition.
          </p>
        </div>

        {/* Lever 3: Minimum Order Value EV Slider */}
        <div className="rounded-2xl border border-border bg-carbon p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-copper/15 text-copper">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-paper text-sm">Min Order Value EV Gate</span>
                <div className="text-[10px] text-text-muted font-mono">Profit Margin Protection</div>
              </div>
            </div>
            <span className="font-serif text-base font-bold text-copper">{inr(minOrderEv)}</span>
          </div>

          <input
            type="range"
            min="20"
            max="500"
            step="10"
            value={minOrderEv}
            onChange={(e) => setMinOrderEv(Number(e.target.value))}
            className="w-full accent-copper cursor-pointer"
          />

          <p className="text-[11px] text-text-muted leading-relaxed">
            Orders below <strong>{inr(minOrderEv)}</strong> are evaluated strictly: if expected recovery probability is under 40%, the agent refuses to send a ₹0.35 WhatsApp message to preserve your unit margins.
          </p>
        </div>

        {/* Lever 4: Card Network Retry Caps */}
        <div className="rounded-2xl border border-border bg-carbon p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-paper text-sm">Card Network Retry Caps</span>
                <div className="text-[10px] text-text-muted font-mono">Visa / Mastercard Rules</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                sound.click()
                setVisaCapMode('standard')
              }}
              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                visaCapMode === 'standard'
                  ? 'border-copper bg-copper/10 text-paper font-semibold'
                  : 'border-border bg-onyx text-text-muted hover:text-paper'
              }`}
            >
              <div className="text-xs">Standard (Visa 20)</div>
              <div className="text-[10px] text-text-faint">Per rolling 30 days</div>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.click()
                setVisaCapMode('conservative')
              }}
              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                visaCapMode === 'conservative'
                  ? 'border-copper bg-copper/10 text-paper font-semibold'
                  : 'border-border bg-onyx text-text-muted hover:text-paper'
              }`}
            >
              <div className="text-xs">Conservative (Visa 15)</div>
              <div className="text-[10px] text-text-faint">Zero-tolerance buffer</div>
            </button>
          </div>

          <p className="text-[11px] text-text-muted leading-relaxed">
            Automatically prevents Mastercard 10/24h and Visa rolling 30-day quota breaches. Avoids regulatory penalty fees ($0.10/$0.25 per retry).
          </p>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-onyx p-4">
        <div className="flex items-center gap-2 text-[11px] text-text-muted font-mono">
          <span className="h-2 w-2 rounded-full bg-pos animate-pulse" />
          <span>Active Invariant Policy Engine: Enterprise Safe</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-xl border border-copper/60 bg-copper px-5 py-2 font-bold text-obsidian hover:bg-copper-hover transition-colors cursor-pointer shadow-md"
        >
          {isSaved ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          <span>{isSaved ? 'Policy Saved!' : 'Save & Apply Guardrails'}</span>
        </button>
      </div>
    </div>
  )
}
