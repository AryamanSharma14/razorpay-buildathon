import { type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ShimmerBadgeProps {
  children: ReactNode
  className?: string
  variant?: 'copper' | 'pos' | 'neg' | 'neutral'
  icon?: ReactNode
  pulse?: boolean
}

export function ShimmerBadge({
  children,
  className,
  variant = 'copper',
  icon,
  pulse = false,
}: ShimmerBadgeProps) {
  const variantStyles = {
    copper: 'border-copper/40 bg-copper/10 text-copper hover:bg-copper/20',
    pos: 'border-pos/40 bg-pos/10 text-pos hover:bg-pos/20',
    neg: 'border-neg/40 bg-neg/10 text-neg hover:bg-neg/20',
    neutral: 'border-border bg-carbon text-bone hover:border-steel',
  }[variant]

  return (
    <span
      className={cn(
        'relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-200',
        variantStyles,
        className
      )}
    >
      {/* Shimmer overlay sweep */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer" />

      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}

      {icon && <span className="shrink-0">{icon}</span>}
      <span className="relative z-10">{children}</span>
    </span>
  )
}
