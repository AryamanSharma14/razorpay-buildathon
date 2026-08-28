import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { Card, CardTitle, PageHeader, Table, Td, Tr } from '../components/common/primitives'
import { QueryBoundary } from '../components/common/states'
import { cn } from '../lib/utils'

const COLORS = ['#6366f1', '#60a5fa', '#38bdf8', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#9a9aac']

const tooltipStyle = {
  background: '#15151d', border: '1px solid #24242f', borderRadius: 8,
  fontSize: 12, color: '#e7e7ee',
} as const

export default function Analytics() {
  const stats = useQuery({ queryKey: qk.stats('all'), queryFn: () => api.stats() })
  const health = useQuery({ queryKey: qk.issuerHealth(), queryFn: () => api.issuerHealth() })

  return (
    <>
      <PageHeader title="Decline Analytics" sub="Why payments fail, and which issuers are degrading" />

      <div className="grid gap-4 lg:grid-cols-2">
        <QueryBoundary query={stats} skeletonRows={5}>
          {(s) => {
            const byReason: Record<string, number> = {}
            for (const [key, n] of Object.entries(s.decline_funnel)) {
              const reason = key.split('|')[0]
              byReason[reason] = (byReason[reason] ?? 0) + n
            }
            const data = Object.entries(byReason)
              .map(([reason, count]) => ({ reason, count }))
              .sort((a, b) => b.count - a.count)
            return (
              <Card>
                <CardTitle>Declines by reason</CardTitle>
                {data.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-text-muted">No declines recorded yet.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ left: -18, top: 4 }}>
                        <CartesianGrid stroke="#24242f" vertical={false} />
                        <XAxis dataKey="reason" tick={{ fill: '#9a9aac', fontSize: 11 }} interval={0} angle={-18}
                          textAnchor="end" height={52} tickLine={false} axisLine={{ stroke: '#24242f' }} />
                        <YAxis allowDecimals={false} tick={{ fill: '#9a9aac', fontSize: 11 }}
                          tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#1c1c26' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            )
          }}
        </QueryBoundary>

        <QueryBoundary query={stats} skeletonRows={5}>
          {(s) => {
            const data = Object.entries(s.rail_split).map(([rail, count]) => ({ rail, count }))
            return (
              <Card>
                <CardTitle>Recovery rail split</CardTitle>
                {data.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-text-muted">No payments recorded yet.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} layout="vertical" margin={{ left: 8, top: 4 }}>
                        <CartesianGrid stroke="#24242f" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fill: '#9a9aac', fontSize: 11 }}
                          tickLine={false} axisLine={{ stroke: '#24242f' }} />
                        <YAxis type="category" dataKey="rail" width={70} tick={{ fill: '#9a9aac', fontSize: 11 }}
                          tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#1c1c26' }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {data.map((d, i) => (
                            <Cell key={i} fill={d.rail === 'upi' ? '#22c55e' : COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            )
          }}
        </QueryBoundary>
      </div>

      <div className="mt-4">
        <QueryBoundary query={health} skeletonRows={4} empty={(h) => h.issuers.length === 0}>
          {(h) => (
            <Card>
              <CardTitle action={<span className="text-[12px] text-text-faint">window: {h.window_minutes} min</span>}>
                Issuer health
              </CardTitle>
              <Table head={['Issuer', 'Method', 'Recent failures', 'Threshold', 'Status']}>
                {h.issuers.map((row) => (
                  <Tr key={`${row.issuer}-${row.method}`}>
                    <Td mono>{row.issuer}</Td>
                    <Td>{row.method}</Td>
                    <Td mono>{row.recent_failures}</Td>
                    <Td mono>{row.threshold}</Td>
                    <Td>
                      <span className={cn(
                        'rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase',
                        row.status === 'degraded' ? 'bg-neg/15 text-neg' : 'bg-pos/15 text-pos',
                      )}>
                        {row.status}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </Table>
            </Card>
          )}
        </QueryBoundary>
      </div>
    </>
  )
}
