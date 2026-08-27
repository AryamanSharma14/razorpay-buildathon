export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <div className="text-sm text-text-muted">Compliance-Bounded Recovery Agent</div>
      <div className="flex items-center gap-3 text-xs text-text-faint">
        <span className="rounded-sm border border-border px-2 py-1">DEMO_MODE</span>
      </div>
    </header>
  )
}
