import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  ShieldAlert,
  ServerCrash,
  Coins,
  ArrowRight,
} from 'lucide-react'
import { Modal } from './Modal'
import { api } from '../../lib/api'
import { sound } from '../../lib/sound'
import { useVerdict } from './VerdictBanner'
import type { ScenarioId } from '../../lib/types'

interface JudgeScenariosModalProps {
  isOpen: boolean
  onClose: () => void
}

export function JudgeScenariosModal({ isOpen, onClose }: JudgeScenariosModalProps) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { showVerdict } = useVerdict()
  const [runningScenario, setRunningScenario] = useState<string | null>(null)

  const simulateMutation = useMutation({
    mutationFn: (body: Parameters<typeof api.simulate>[0]) => api.simulate(body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries()
      setRunningScenario(null)
      sound.success()

      const s = variables.scenario
      if (s === 'payday' || s === 'soft') {
        showVerdict({
          type: 'recovered',
          title: 'SCENARIO 1: PAYDAY RECOVERY ACTIVATED',
          detail: 'Soft decline on ₹1,499 scheduled for salary deposit window at Hour 34 (84% probability vs 18% baseline).',
        })
        navigate('/queue')
      } else if (s === 'hard') {
        showVerdict({
          type: 'blocked',
          title: 'SCENARIO 2: VISA CAT-1 SHIELD ENFORCED',
          detail: 'Permanent decline halted. ₹8.30 Visa fine prevented. Alternate UPI 1-tap link generated.',
        })
        navigate('/policy')
      } else if (s === 'downtime') {
        showVerdict({
          type: 'info',
          title: 'SCENARIO 3: BANK OUTAGE SENTINEL',
          detail: 'KOTAK downtime started. Transactions safely parked in hold queue without burning customer attempts.',
        })
        navigate('/queue')
      } else if (s === 'ev_negative') {
        showVerdict({
          type: 'info',
          title: 'SCENARIO 4: UNECONOMIC ORDER SKIPPED',
          detail: '₹20 micro-payment skipped chasing. EV calculation proved ₹0.35 WhatsApp fee would cause net loss.',
        })
        navigate('/audit')
      }
      onClose()
    },
    onError: () => {
      setRunningScenario(null)
    },
  })

  const runScenario = (scenarioKey: ScenarioId) => {
    sound.click()
    setRunningScenario(scenarioKey)
    simulateMutation.mutate({
      scenario: scenarioKey,
      count: 1,
      advance_hours: scenarioKey === 'payday' ? 34 : 0,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Judge Evaluation Scenarios (1-Click Demos)"
      className="max-w-3xl"
    >
      <div className="space-y-4 pt-2 text-xs">
        <p className="text-[11px] text-text-muted">
          Select any enterprise scenario below to run it through the live webhook pipeline and inspect real-time decisions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Scenario 1 */}
        <div
          onClick={() => runScenario('payday')}
          className="group relative cursor-pointer rounded-2xl border border-border bg-surface p-4.5 transition-all hover:border-copper hover:bg-surface-hover shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-copper/15 text-copper group-hover:scale-105 transition-transform">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="font-bold text-paper text-sm">1. Payday ML Recovery</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-pos/20 text-pos px-2 py-0.5 rounded-full border border-pos/40">
              Soft Decline
            </span>
          </div>
          <p className="text-text-muted text-[11px] leading-relaxed">
            Customer order of <strong>₹1,499</strong> fails due to <code>insufficient_funds</code>. Rather than retrying in 24 hours (empty bank account), the 240h ML horizon snaps to Hour 34 salary credit batch.
          </p>
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-copper font-medium">Expected Lift: +15.6 pts</span>
            <button
              type="button"
              disabled={runningScenario !== null}
              className="flex items-center gap-1 font-semibold text-copper group-hover:translate-x-0.5 transition-transform"
            >
              <span>{runningScenario === 'payday' ? 'Simulating...' : 'Run Scenario'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Scenario 2 */}
        <div
          onClick={() => runScenario('hard')}
          className="group relative cursor-pointer rounded-2xl border border-border bg-surface p-4.5 transition-all hover:border-neg/70 hover:bg-surface-hover shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neg/15 text-neg group-hover:scale-105 transition-transform">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <span className="font-bold text-paper text-sm">2. Visa Cat-1 Fine Shield</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-neg/20 text-neg px-2 py-0.5 rounded-full border border-neg/40">
              Hard Decline
            </span>
          </div>
          <p className="text-text-muted text-[11px] leading-relaxed">
            Card declines with permanent error <code>card_expired</code>. Visa Operating Rules mandate $0.10 ($0.25 cross-border) fines for retries. The agent halts retries and serves a UPI link.
          </p>
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-neg font-medium">Fines Avoided: ₹8.30</span>
            <button
              type="button"
              disabled={runningScenario !== null}
              className="flex items-center gap-1 font-semibold text-neg group-hover:translate-x-0.5 transition-transform"
            >
              <span>{runningScenario === 'hard' ? 'Simulating...' : 'Run Scenario'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Scenario 3 */}
        <div
          onClick={() => runScenario('downtime')}
          className="group relative cursor-pointer rounded-2xl border border-border bg-surface p-4.5 transition-all hover:border-amber-500/70 hover:bg-surface-hover shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 group-hover:scale-105 transition-transform">
                <ServerCrash className="h-4 w-4" />
              </div>
              <span className="font-bold text-paper text-sm">3. Bank Outage Sentinel</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/40">
              payment.downtime
            </span>
          </div>
          <p className="text-text-muted text-[11px] leading-relaxed">
            Kotak Mahindra bank netbanking gateway goes down. Engine consumes <code>payment.downtime.started</code>, classifies failure as infrastructure, and parks orders until resolved.
          </p>
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-amber-400 font-medium">Zero Burn on Quota</span>
            <button
              type="button"
              disabled={runningScenario !== null}
              className="flex items-center gap-1 font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform"
            >
              <span>{runningScenario === 'downtime' ? 'Simulating...' : 'Run Scenario'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Scenario 4 */}
        <div
          onClick={() => runScenario('ev_negative')}
          className="group relative cursor-pointer rounded-2xl border border-border bg-surface p-4.5 transition-all hover:border-steel hover:bg-surface-hover shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-carbon border border-border text-bone group-hover:scale-105 transition-transform">
                <Coins className="h-4 w-4" />
              </div>
              <span className="font-bold text-paper text-sm">4. Uneconomic Skip (EV Gate)</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-carbon text-text-muted px-2 py-0.5 rounded-full border border-border">
              EV Gate
            </span>
          </div>
          <p className="text-text-muted text-[11px] leading-relaxed">
            Micro-order of <strong>₹20</strong> fails. Expected Value formula <code>EV = p × Amount - ChannelCost</code> yields -₹0.15 net. Engine refuses to chase, protecting merchant profit margin.
          </p>
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-text-muted font-medium">Decision: skipped_uneconomic</span>
            <button
              type="button"
              disabled={runningScenario !== null}
              className="flex items-center gap-1 font-semibold text-bone group-hover:translate-x-0.5 transition-transform"
            >
              <span>{runningScenario === 'ev_negative' ? 'Simulating...' : 'Run Scenario'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
    </Modal>
  )
}
