import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, ShieldCheck, Sliders, Sparkles, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { inr, pct } from '../lib/format'
import { Card, CardTitle, PageHeader, Table, Td, Tr, Button } from '../components/common/primitives'
import { KpiCard } from '../components/common/KpiCard'
import { Stat } from '../components/common/Stat'
import { QueryBoundary } from '../components/common/states'
import { DisclaimerNote } from '../components/common/badges'
import { SandboxPanel } from '../components/common/SandboxPanel'
import { MerchantPolicyPanel } from '../components/common/MerchantPolicyPanel'
import { GlowBackdrop } from '../components/reactbits/GlowBackdrop'
import { SpotlightCard } from '../components/reactbits/SpotlightCard'
import { exportCsv } from '../lib/exportCsv'
import { sound } from '../lib/sound'
import { cn } from '../lib/utils'

export default function Policy() {
  const [activeTab, setActiveTab] = useState<'rules' | 'sandbox' | 'guardrails'>('rules')
  const backtest = useQuery({ queryKey: qk.backtest(), queryFn: () => api.backtest() })
  const fines = useQuery({ queryKey: qk.fineAvoidance(), queryFn: () => api.fineAvoidance() })

  const handleExportCsv = () => {
    if (!backtest.data?.policies) return
    exportCsv(
      'policy_comparison_backtest',
      [
        { key: 'policy', label: 'Policy / Strategy' },
        { key: 'rate_pct', label: 'Recovery Rate %' },
        { key: 'recovered', label: 'Recovered Count' },
        { key: 'total_attempts', label: 'Attempts Fired' },
        { key: 'fines_inr', label: 'Fines Incurred (INR)' },
        { key: 'lift_pts', label: 'Lift vs Baseline' },
      ],
      backtest.data.policies
    )
  }

  return (
    <div className="relative space-y-6 max-w-7xl mx-auto pb-12">
      <GlowBackdrop color="copper" />

      <PageHeader
        title="Safety, Compliance & Policy Sandbox"
        sub="Visa/Mastercard network cap protection, Category-1 hard decline shielding, and multi-policy comparison."
        action={
          <Button
            variant="default"
            onClick={handleExportCsv}
            disabled={!backtest.data?.policies?.length}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        }
      />

      {/* Modern Tabs */}
      <div className="flex items-center gap-3 border-b border-border/80 pb-2">
        <button
          type="button"
          onClick={() => {
            sound.click()
            setActiveTab('rules')
          }}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer',
            activeTab === 'rules'
              ? 'bg-copper text-obsidian shadow-sm'
              : 'text-text-muted hover:text-paper hover:bg-carbon'
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Compliance Rules & Policy Benchmarks</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.click()
            setActiveTab('sandbox')
          }}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer',
            activeTab === 'sandbox'
              ? 'bg-copper text-obsidian shadow-sm'
              : 'text-text-muted hover:text-paper hover:bg-carbon'
          )}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>What-If Policy Sandbox</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.click()
            setActiveTab('guardrails')
          }}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer',
            activeTab === 'guardrails'
              ? 'bg-copper text-obsidian shadow-sm'
              : 'text-text-muted hover:text-paper hover:bg-carbon'
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Merchant Guardrails & Enterprise Levers</span>
        </button>
      </div>

      {activeTab === 'rules' ? (
        <div className="space-y-6">
          {/* 1. Side-by-Side Policy Benchmark Backtest */}
          <QueryBoundary query={backtest} skeletonRows={6}>
            {(b) => {
              const policies = b.policies.map((p) => ({
                policy: p.policy,
                recovery_rate_pct: p.rate_pct,
                recovered: `${p.recovered} / ${p.n}`,
                attempts: p.total_attempts,
                fines_inr: p.fines_inr,
                lift_pts: p.lift_pts,
              }))

              const oursPolicy = policies.find((p) => /ours/i.test(p.policy))
              const aggressivePolicy = policies.find((p) => /aggressive/i.test(p.policy))
              const finesAvoided = (aggressivePolicy?.fines_inr ?? 0) - (oursPolicy?.fines_inr ?? 0)

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <KpiCard
                      label="Ours: ML + Payday recovery"
                      value={<Stat value={b.recovery_rate_pct} suffix="%" decimals={1} />}
                      tone="recovered"
                      sub="peak rate on synthetic holdout"
                      tip="Multi-rail ML policy with salary credit deposit window snapping."
                    />
                    <KpiCard
                      label="Razorpay default baseline"
                      value={<Stat value={b.control_rate_pct} suffix="%" decimals={1} />}
                      tone="pending"
                      sub="3 reminders, fixed-slot 24h"
                      tip="Default industry baseline: 3 reminders at fixed 24h intervals."
                    />
                    <KpiCard
                      label="Autonomous lift"
                      value={<Stat value={b.lift_pts} prefix="+" suffix=" pts" decimals={1} />}
                      tone="recovered"
                      sub="performance advantage"
                      tip="Net recovery rate improvement over standard 24h retry logic."
                    />
                    <KpiCard
                      label="Direct fine savings"
                      value={<Stat value={finesAvoided} prefix="₹" decimals={2} />}
                      tone="recovered"
                      sub="regulatory penalties prevented"
                      tip="Calculated money saved by refusing to fire illegal retry attempts."
                    />
                  </div>

                  <Card className="relative p-6 overflow-hidden">
                    <CardTitle action={<span className="text-xs text-text-muted font-mono">Identical dataset tested</span>}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-copper" />
                        <span>Side-by-side Strategy Benchmark: 3 Policies on Identical Payments</span>
                      </div>
                    </CardTitle>
                    <Table head={['Strategy / Policy', 'Recovery rate', 'Payments recovered', 'Attempts fired', 'Network fines incurred', 'Lift vs Baseline']}>
                      {policies.map((p: { policy: string; recovery_rate_pct: number; recovered: string; attempts: number; fines_inr: number; lift_pts: number }) => {
                        const ours = /ours|bounded|agent/i.test(p.policy)
                        return (
                          <Tr key={p.policy}>
                            <Td className={cn('font-semibold', ours ? 'text-paper font-bold' : 'text-text-muted')}>
                              <div className="flex items-center gap-2">
                                {ours && <CheckCircle2 className="h-3.5 w-3.5 text-copper" />}
                                <span>{p.policy}</span>
                              </div>
                            </Td>
                            <Td mono className="text-paper font-bold">{pct(p.recovery_rate_pct)}</Td>
                            <Td mono className="text-bone">{p.recovered}</Td>
                            <Td mono className="text-bone">{p.attempts}</Td>
                            <Td mono className={cn(p.fines_inr > 0 ? 'text-copper font-bold' : 'text-paper font-semibold')}>
                              {inr(p.fines_inr, { decimals: true })}
                            </Td>
                            <Td mono className={cn('text-right font-bold', p.lift_pts > 0 ? 'text-pos' : p.lift_pts < 0 ? 'text-neg' : 'text-text-muted')}>
                              {p.lift_pts > 0 ? `+${p.lift_pts.toFixed(1)} pts` : `${p.lift_pts.toFixed(1)} pts`}
                            </Td>
                          </Tr>
                        )
                      })}
                    </Table>
                  </Card>
                </div>
              )
            }}
          </QueryBoundary>

          {/* 2. Fine Avoidance Real-Time Summary */}
          <QueryBoundary query={fines} skeletonRows={4}>
            {(f) => (
              <Card className="p-6">
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-copper" />
                    <span>Autonomous Regulatory Fine Shield Breakdown</span>
                  </div>
                </CardTitle>
                <div className="grid gap-4 sm:grid-cols-3 pt-2">
                  <SpotlightCard
                    className="p-5 space-y-1.5 shadow-sm border border-border"
                    spotlightColor="rgba(204, 145, 102, 0.2)"
                    title="Visa & Mastercard Network Penalties Blocked"
                  >
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Fines Prevented</span>
                    <div className="font-serif text-3xl font-bold text-copper">{inr(f.fines_avoided_inr)}</div>
                    <span className="text-[11px] text-text-faint">Saved across Visa Cat-1 and Mastercard TPE</span>
                  </SpotlightCard>

                  <SpotlightCard
                    className="p-5 space-y-1.5 shadow-sm border border-border"
                    spotlightColor="rgba(226, 227, 233, 0.12)"
                    title="Permanent Card Declines Blocked with Zero Retries"
                  >
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Blocked Hard Declines</span>
                    <div className="font-serif text-3xl font-bold text-paper">{f.blocked_hard_declines}</div>
                    <span className="text-[11px] text-text-faint">0 retries fired on expired/invalid accounts</span>
                  </SpotlightCard>

                  <SpotlightCard
                    className="p-5 space-y-1.5 shadow-sm border border-border"
                    spotlightColor="rgba(204, 145, 102, 0.15)"
                    title="Network Rate Limit Violations Enforced"
                  >
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Network Cap Enforcements</span>
                    <div className="font-serif text-3xl font-bold text-paper">{f.blocked_cap_violations}</div>
                    <span className="text-[11px] text-text-faint">Halted at Visa 30d (20 retries) / MC limit</span>
                  </SpotlightCard>
                </div>
              </Card>
            )}
          </QueryBoundary>

          <DisclaimerNote>
            Policy comparison backtest conducted on synthetic held-out distribution (circular validation). Rates demonstrate scheduler capability vs blind fixed-delay baseline.
          </DisclaimerNote>
        </div>
      ) : activeTab === 'sandbox' ? (
        <SandboxPanel />
      ) : (
        <MerchantPolicyPanel />
      )}
    </div>
  )
}
