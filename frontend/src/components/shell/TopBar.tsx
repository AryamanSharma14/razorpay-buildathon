export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <div className="text-[13px] text-text-muted">Compliance-bounded recovery agent</div>
      <div className="flex items-center gap-3 text-[11px] text-text-faint">
        <span className="rounded-full border border-border px-2.5 py-1 uppercase tracking-[0.06em]">
          Demo mode
        </span>
      </div>
    </header>
  )
}
