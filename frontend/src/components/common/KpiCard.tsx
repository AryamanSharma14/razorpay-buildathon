import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { InfoTip } from './primitives'

type Tone = 'accent' | 'pos' | 'neg' | 'warn' | 'info' | 'muted'

const RAIL: Record<Tone, string> = {
  accent: 'bg-accent',
  pos: 'bg-pos',
  neg: 'bg-neg',
  warn: 'bg-warn',
  info: 'bg-info',
  muted: 'bg-border-strong',
}

export function KpiCard({
  label,
  value,
  sub,
  tone = 'muted',
  onClick,
  children,
  tip,
}: {
  label: string
  value: ReactNode
  /** required for any rate — enforces "no rate ships without its control" */
  sub?: ReactNode
  tone?: Tone
  onClick?: () => void
  children?: ReactNode
  /** plain-English explanation shown on hover of the ⓘ */
  tip?: string
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-surface p-4 pl-5 shadow-[0_1px_2px_rgba(0,0,0,.4)]',
        onClick && 'cursor-pointer transition-colors hover:bg-surface-hover',
      )}
    >
      <span className={cn('absolute left-0 top-0 h-full w-[3px]', RAIL[tone])} />
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint">
        {label}
        {tip && <InfoTip text={tip} />}
      </div>
      <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-[12px] text-text-muted">{sub}</div>}
      {children}
    </div>
  )
}
