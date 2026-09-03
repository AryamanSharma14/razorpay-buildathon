import { Calendar, Sparkles } from 'lucide-react'
import { useDateRange, type TimePreset } from '../../lib/dateRange'
import { sound } from '../../lib/sound'
import { cn } from '../../lib/utils'

interface TimeFilterProps {
  className?: string
  showLabel?: boolean
}

export function TimeFilter({ className, showLabel = true }: TimeFilterProps) {
  const { preset, setPreset } = useDateRange()

  const options: { id: TimePreset; label: string; shortLabel: string; hint: string }[] = [
    {
      id: 'today',
      label: 'Today (Live Session)',
      shortLabel: 'Today (Live)',
      hint: 'Shows checkouts and recoveries generated during today\'s live session.',
    },
    {
      id: '24h',
      label: 'Past 24 Hours',
      shortLabel: 'Past 24h',
      hint: 'Rolling 24-hour activity window.',
    },
    {
      id: '7d',
      label: 'Last 7 Days (Baseline)',
      shortLabel: '7D (Baseline)',
      hint: 'Includes the 48-hour pre-seeded merchant baseline (₹26,882 recaptured).',
    },
    {
      id: 'all',
      label: 'All Time',
      shortLabel: 'All Time',
      hint: 'Complete historical and session transaction ledger.',
    },
  ]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted font-medium mr-1">
          <Calendar className="h-3.5 w-3.5 text-copper" />
          <span>Time Horizon:</span>
        </div>
      )}
      <div
        className="inline-flex items-center rounded-xl border border-border bg-onyx/80 p-1 shadow-inner backdrop-blur-sm"
        role="group"
        aria-label="Select transaction time horizon"
      >
        {options.map((opt) => {
          const isActive = preset === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                sound.click()
                setPreset(opt.id)
              }}
              title={opt.hint}
              className={cn(
                'relative flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer select-none',
                isActive
                  ? 'bg-copper text-obsidian shadow-sm'
                  : 'text-text-muted hover:text-paper hover:bg-carbon/60'
              )}
            >
              {opt.id === 'today' && (
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isActive ? 'bg-obsidian animate-pulse' : 'bg-pos animate-pulse'
                  )}
                />
              )}
              {opt.id === '7d' && (
                <Sparkles className={cn('h-3 w-3', isActive ? 'text-obsidian' : 'text-copper')} />
              )}
              <span className="hidden md:inline">{opt.label}</span>
              <span className="md:hidden">{opt.shortLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
