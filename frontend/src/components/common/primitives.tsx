import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,.4)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Hover tooltip for plain-English explanations. CSS-only, no JS state. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex align-middle">
      <span className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-border-strong text-[9px] font-bold text-text-faint hover:text-text-muted">
        i
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-60 -translate-x-1/2 rounded-sm border border-border bg-surface-hover px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug tracking-normal text-text opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100">
        {text}
      </span>
    </span>
  )
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold">{children}</h2>
      {action}
    </div>
  )
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {sub && <p className="mt-1 text-[13px] text-text-muted">{sub}</p>}
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
    default: 'border border-border bg-surface hover:bg-surface-hover text-text',
    primary: 'bg-accent text-accent-fg hover:opacity-90',
    danger: 'border border-neg/40 text-neg hover:bg-neg/10',
    ghost: 'text-text-muted hover:bg-surface-hover hover:text-text',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none',
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
