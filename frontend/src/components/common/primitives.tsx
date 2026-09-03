import { useId } from 'react'
import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all duration-200 hover:border-border-strong',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Hover tooltip for plain-English explanations. CSS-only (no JS state).
 */
export function InfoTip({ text }: { text: string }) {
  const id = useId()
  return (
    <span className="group/tip relative inline-flex align-middle">
      <span
        tabIndex={0}
        aria-describedby={id}
        className="-m-1.5 flex h-6 w-6 cursor-help items-center justify-center rounded-full p-1.5 outline-none focus-visible:ring-1 focus-visible:ring-copper"
      >
        <Info className="h-3.5 w-3.5 text-text-faint transition-colors group-hover/tip:text-copper group-focus-within/tip:text-copper" strokeWidth={2.5} />
      </span>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-max max-w-[16rem] rounded-xl border border-border-strong bg-[#121318] px-3.5 py-2.5 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-bone opacity-0 shadow-2xl transition-all duration-200 translate-y-1 group-hover/tip:translate-y-0 group-hover/tip:opacity-100 group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100"
      >
        {text}
        <span className="absolute -bottom-[5px] left-[9px] h-2 w-2 rotate-45 rounded-[1px] border-b border-r border-border-strong bg-[#121318]" />
      </span>
    </span>
  )
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
      <h2 className="text-[15px] font-semibold text-paper tracking-tight">{children}</h2>
      {action}
    </div>
  )
}

/** Serif display heading, >=28px only (Slash rule). Use for page h1 / hero numbers. */
export function Display({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={cn('font-serif text-2xl sm:text-3xl lg:text-[32px] font-bold leading-tight tracking-tight text-paper', className)}>
      {children}
    </h1>
  )
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <Display>{title}</Display>
        {sub && <p className="text-xs sm:text-[13px] text-text-muted leading-relaxed max-w-3xl">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'default',
  disabled,
  className,
  type = 'button',
  title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
  title?: string
}) {
  const styles = {
    default: 'border border-border bg-carbon text-bone hover:border-steel hover:text-paper shadow-xs',
    primary: 'border border-copper bg-copper text-obsidian font-bold hover:bg-copper-glow shadow-sm',
    danger: 'border border-copper/50 bg-copper/10 text-copper hover:bg-copper/20',
    ghost: 'text-text-muted hover:bg-carbon hover:text-paper',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-95',
        styles,
        className,
      )}
    >
      {children}
    </button>
  )
}

export function StatRow({ label, value, tone }: { label: string; value: ReactNode; tone?: 'pos' | 'neg' | 'warn' }) {
  const c = tone === 'pos' ? 'text-pos' : tone === 'neg' ? 'text-neg' : tone === 'warn' ? 'text-warn' : 'text-paper'
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 py-2.5 last:border-0">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={cn('font-mono text-xs font-semibold tabular-nums', c)}>{value}</span>
    </div>
  )
}

/** Pill segmented control. options: [{value,label}]. Controlled. */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-onyx p-0.5 shadow-inner">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer',
            value === o.value
              ? 'bg-copper text-obsidian shadow-sm'
              : 'text-text-muted hover:text-bone hover:bg-carbon/50',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/80 bg-onyx/40">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-carbon/60 text-[10px] uppercase font-bold tracking-wider text-text-faint">
            {head.map((h) => (
              <th key={h} className="px-3.5 py-2.5 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">{children}</tbody>
      </table>
    </div>
  )
}

export function Td({ children, className, mono }: { children: ReactNode; className?: string; mono?: boolean }) {
  return (
    <td className={cn('px-3.5 py-2.5 align-middle text-xs', mono && 'font-mono text-[11px]', className)}>{children}</td>
  )
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn('transition-colors duration-150', onClick ? 'cursor-pointer hover:bg-carbon' : 'hover:bg-carbon/40')}
    >
      {children}
    </tr>
  )
}
