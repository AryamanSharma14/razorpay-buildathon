import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { InfoTip } from './primitives'
import { type Outcome } from '../../lib/outcome'
import { SpotlightCard } from '../reactbits/SpotlightCard'

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

const SPOTLIGHT_COLORS: Record<Outcome, string> = {
  recovered: 'rgba(91, 185, 140, 0.16)',
  blocked: 'rgba(204, 145, 102, 0.18)',
  skipped: 'rgba(145, 148, 161, 0.12)',
  pending: 'rgba(204, 145, 102, 0.14)',
}

const BORDER_ACCENTS: Record<Outcome, string> = {
  recovered: 'border-l-4 border-l-pos',
  blocked: 'border-l-4 border-l-copper',
  skipped: 'border-l-4 border-l-steel',
  pending: 'border-l-4 border-l-fog',
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
  sub?: ReactNode
  tone?: Tone
  onClick?: () => void
  children?: ReactNode
  tip?: string
}) {
  const outcomeKey = TO_OUTCOME[tone]
  const accent = BORDER_ACCENTS[outcomeKey]
  const spotlight = SPOTLIGHT_COLORS[outcomeKey]

  return (
    <SpotlightCard
      spotlightColor={spotlight}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all duration-300 hover:border-steel/80 hover:shadow-lg',
        accent,
        onClick && 'cursor-pointer hover:bg-surface-hover hover:scale-[1.01]'
      )}
      title={tip}
    >
      <div onClick={onClick} className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted">
          <span className="truncate pr-2">{label}</span>
          {tip && <InfoTip text={tip} />}
        </div>
        <div className="font-serif text-2xl lg:text-3xl font-bold leading-tight tabular-nums text-paper tracking-tight py-1">
          {value}
        </div>
        {sub && <div className="text-xs text-text-muted font-sans leading-snug">{sub}</div>}
        {children}
      </div>
    </SpotlightCard>
  )
}
