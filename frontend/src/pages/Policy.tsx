import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { inr, pct } from '../lib/format'
import { Card, CardTitle, PageHeader, Table, Td, Tr } from '../components/common/primitives'
import { KpiCard } from '../components/common/KpiCard'
import { QueryBoundary } from '../components/common/states'
import { DisclaimerNote } from '../components/common/badges'
import { cn } from '../lib/utils'

export default function Policy() {
  const backtest = useQuery({ queryKey: qk.backtest(), queryFn: () => api.backtest() })

  return (
    <>
      <PageHeader title="Policy Comparison" sub="Our compliance-bounded policy vs naive strategies, replayed on synthetic history" />
      <QueryBoundary query={backtest} skeletonRows={6}>
        {(b) => {
          if (b.error) {
            return (
              <Card>
                <p className="py-6 text-center text-[13px] text-neg">Backtest unavailable: {String(b.error)}</p>
              </Card>
            )
          }
          const policies = b.policies ?? []
          return (
            <>
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                <KpiCard label="Aggressive-policy fines" value={inr(b.aggressive_fines_inr ?? 0, { decimals: true })}
                  tone="neg" sub="retry-everything ignores Visa Cat-1" />
                <KpiCard label="Our policy fines" value={inr(b.ours_fines_inr ?? 0, { decimals: true })}
                  tone="pos" sub="hard declines never re-presented" />
                <KpiCard label="Fines avoided"
                  value={inr((b.aggressive_fines_inr ?? 0) - (b.ours_fines_inr ?? 0), { decimals: true })}
                  tone="warn" sub="compliance value per replay window" />
              </div>

              <div className="mt-4">
                <Card>
                  <CardTitle>Replay results by policy</CardTitle>
                  <Table head={['Policy', 'Recovery rate', 'Recovered', 'Attempts', 'Fines (INR)', '']}>
                    {policies.map((p) => {
                      const ours = /ours|bounded|agent/i.test(p.policy)
                      return (
                        <Tr key={p.policy}>
                          <Td className={cn(ours && 'font-semibold text-accent')}>{p.policy}</Td>
                          <Td mono>{pct(p.recovery_rate_pct)}</Td>
                          <Td mono>{p.recovered}</Td>
                          <Td mono>{p.attempts}</Td>
                          <Td mono>{inr(p.fines_inr, { decimals: true })}</Td>
                          <Td>{ours && <span className="rounded-sm bg-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent">this agent</span>}</Td>
                        </Tr>
                      )
                    })}
                  </Table>
                  {b.disclaimer && (
                    <div className="mt-4">
                      <DisclaimerNote>{b.disclaimer}</DisclaimerNote>
                    </div>
                  )}
                </Card>
              </div>
            </>
          )
        }}
      </QueryBoundary>
    </>
  )
}
