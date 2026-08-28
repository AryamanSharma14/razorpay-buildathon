import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { InfoTip } from './primitives'
import { OUTCOME, type Outcome } from '../../lib/outcome'

// Accept the legacy tone names the pages already pass; fold them into the four
// outcome buckets so the colour language is consistent everywhere.
type Tone = Outcome | 'accent' | 'pos' | 'neg' | 'warn' | 'info' | 'muted'

const TO_OUTCOME: Record<Tone, Outcome> = {
  recovered: 'recovered',
  blocked: 'blocked',
  skipped: 'skipped',
  pending: 'pending',
  pos: 'recovered',
  accent: 'blocked',
  neg: 'blocked',
  warn: 'skipped',
  info: 'pending',
  muted: 'pending',
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
  const rail = OUTCOME[TO_OUTCOME[tone]].rail
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-surface p-4 pl-5',
        onClick && 'cursor-pointer transition-colors hover:bg-surface-hover',
      )}
    >
      <span className={cn('absolute left-0 top-0 h-full w-[3px]', rail)} />
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint">
        {label}
        {tip && <InfoTip text={tip} />}
      </div>
      <div className="mt-1.5 font-serif text-[30px] font-medium leading-none tabular-nums text-paper">
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[12px] text-text-muted">{sub}</div>}
      {children}
    </div>
  )
}
