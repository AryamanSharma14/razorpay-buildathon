import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { Card, CardTitle, PageHeader, Table, Td, Tr } from '../components/common/primitives'
import { QueryBoundary } from '../components/common/states'
import { cn } from '../lib/utils'

// Slash: gilded-tone data-viz ramp on obsidian.
const COLORS = ['#cc9166', '#c7a882', '#b9a58e', '#9194a1', '#777a88', '#e2e3e9', '#acafb9', '#5e616e']
const AXIS = '#1c1d22'
const TICK = '#9194a1'

const tooltipStyle = {
  background: '#121317', border: '1px solid #2e3038', borderRadius: 10,
  fontSize: 12, color: '#e2e3e9',
} as const

export default function Analytics() {
  const stats = useQuery({ queryKey: qk.stats('all'), queryFn: () => api.stats() })
  const health = useQuery({ queryKey: qk.issuerHealth(), queryFn: () => api.issuerHealth() })

  return (
    <>
      <PageHeader title="Decline Analytics" sub="Why payments fail, which payment method recovers best, and which banks are struggling." />

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
                <CardTitle>Why payments fail</CardTitle>
                {data.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-text-muted">No declines recorded yet.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ left: -18, top: 4 }}>
                        <CartesianGrid stroke={AXIS} vertical={false} />
                        <XAxis dataKey="reason" tick={{ fill: TICK, fontSize: 11 }} interval={0} angle={-18}
                          textAnchor="end" height={52} tickLine={false} axisLine={{ stroke: AXIS }} />
                        <YAxis allowDecimals={false} tick={{ fill: TICK, fontSize: 11 }}
                          tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#121317' }} />
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
                <CardTitle>Which method recovered it</CardTitle>
                {data.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-text-muted">No payments recorded yet.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} layout="vertical" margin={{ left: 8, top: 4 }}>
                        <CartesianGrid stroke={AXIS} horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fill: TICK, fontSize: 11 }}
                          tickLine={false} axisLine={{ stroke: AXIS }} />
                        <YAxis type="category" dataKey="rail" width={70} tick={{ fill: TICK, fontSize: 11 }}
                          tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#121317' }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {data.map((d, i) => (
                            <Cell key={i} fill={d.rail === 'upi' ? '#ffffff' : COLORS[i % COLORS.length]} />
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
                Bank health watch
              </CardTitle>
              <Table head={['Bank', 'Method', 'Failures recently', 'Alarm level', 'Status']}>
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
