import { AlertCircle, Inbox, Play } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './primitives'

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded-xs bg-surface-hover" />
      ))}
    </div>
  )
}

export function EmptyState({
  message,
  cta,
  action,
  showSimulateAction,
}: {
  message: string
  cta?: ReactNode
  action?: ReactNode
  showSimulateAction?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-text-muted">
      <Inbox className="h-6 w-6 text-text-faint" />
      <p className="max-w-xs text-[13px] leading-relaxed">{message}</p>
      {action ?? cta}
      {showSimulateAction && (
        <Link to="/simulator" className="mt-1">
          <Button variant="primary">
            <Play className="h-3 w-3" />
            <span>Run a live demo</span>
          </Button>
        </Link>
      )}
    </div>
  )
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <AlertCircle className="h-6 w-6 text-neg" />
      <p className="text-[13px] text-neg">{msg}</p>
      {retry && (
        <Button onClick={retry} variant="default">
          Retry
        </Button>
      )}
    </div>
  )
}

// One wrapper the panels use so no query state is silently swallowed.
export function QueryBoundary<T>({
  query,
  skeletonRows,
  empty,
  children,
}: {
  query: { data?: T; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void }
  skeletonRows?: number
  empty?: (data: T) => boolean
  children: (data: T) => ReactNode
}) {
  if (query.isLoading) return <Skeleton rows={skeletonRows} />
  if (query.isError) return <ErrorState error={query.error} retry={query.refetch} />
  const data = query.data as T
  if (empty && empty(data)) return <EmptyState message="No data yet." showSimulateAction />
  return <>{children(data)}</>
}
