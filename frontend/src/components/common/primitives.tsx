import { useId } from 'react'
import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn('rounded-md border border-border bg-surface p-5', className)}
    >
      {children}
    </div>
  )
}

/**
 * Hover tooltip for plain-English explanations. CSS-only (no JS state).
 * - The bubble is left-aligned with the icon and grows to the right, so it
 *   never overflows the viewport on cards at the left edge of a row.
 * - The trigger has a padded hover zone (bigger than the visible dot) and is
 *   keyboard-focusable, so the tip also shows on focus.
 * NOTE: do not render inside an `overflow-hidden` ancestor — the bubble is
 * absolutely positioned above the trigger.
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
        <Info className="h-3.5 w-3.5 text-text-faint transition-colors group-hover/tip:text-accent group-focus-within/tip:text-accent" strokeWidth={2.5} />
      </span>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-max max-w-[15rem] rounded-[10px] border border-border-strong bg-carbon px-3 py-2 text-[11px] font-normal normal-case leading-snug tracking-normal text-text opacity-0 shadow-[var(--shadow-subtle)] transition-all duration-150 translate-y-1 group-hover/tip:translate-y-0 group-hover/tip:opacity-100 group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100"
      >
        {text}
        <span className="absolute -bottom-[5px] left-[7px] h-2 w-2 rotate-45 rounded-[1px] border-b border-r border-border-strong bg-surface-hover" />
      </span>
    </span>
  )
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[15px] font-semibold">{children}</h2>
      {action}
    </div>
  )
}

/** Serif display heading, >=28px only (Slash rule). Use for page h1 / hero numbers. */
export function Display({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={cn('font-serif text-[32px] font-medium leading-tight tracking-tight', className)}>
      {children}
    </h1>
  )
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        <Display>{title}</Display>
        {sub && <p className="mt-1.5 text-[13px] text-text-muted">{sub}</p>}
      </div>
      {action}
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
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  const styles = {
    default: 'border border-steel/60 text-bone hover:bg-carbon',
    primary: 'bg-paper text-obsidian hover:bg-mist',
    danger: 'border border-copper/50 text-copper hover:bg-copper/10',
    ghost: 'text-fog hover:bg-carbon hover:text-bone',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none',
        styles,
        className,
      )}
    >
      {children}
    </button>
  )
}

export function StatRow({ label, value, tone }: { label: string; value: ReactNode; tone?: 'pos' | 'neg' | 'warn' }) {
  const c = tone === 'pos' ? 'text-pos' : tone === 'neg' ? 'text-neg' : tone === 'warn' ? 'text-warn' : 'text-text'
  return (
    <div className="flex items-baseline justify-between border-b border-border py-2 last:border-0">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className={cn('font-mono text-sm tabular-nums', c)}>{value}</span>
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
    <div className="inline-flex rounded-full border border-border bg-onyx p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
            value === o.value ? 'bg-paper text-obsidian' : 'text-fog hover:text-bone',
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
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-faint">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Td({ children, className, mono }: { children: ReactNode; className?: string; mono?: boolean }) {
  return (
    <td className={cn('px-3 py-2 align-top', mono && 'font-mono text-[12px]', className)}>{children}</td>
  )
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn('border-b border-border/60 last:border-0', onClick && 'cursor-pointer hover:bg-surface-hover')}
    >
      {children}
    </tr>
  )
}
