import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'

export type TimePreset = 'today' | '24h' | '7d' | 'all'

interface DateRangeContextType {
  preset: TimePreset
  setPreset: (p: TimePreset) => void
  fromDate: string
  toDate: string
  setDateRange: (from: string, to: string) => void
  clearDateRange: () => void
  rangeKey: string
  hasFilter: boolean
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined)

function computeDatesForPreset(preset: TimePreset): { fromDate: string; toDate: string } {
  const now = new Date()
  if (preset === 'today') {
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return { fromDate: `${year}-${month}-${day} 00:00:00`, toDate: '' }
  }
  if (preset === '24h') {
    const past = new Date(now.getTime() - 24 * 3600 * 1000)
    return { fromDate: past.toISOString().replace('T', ' ').slice(0, 19), toDate: '' }
  }
  if (preset === '7d') {
    const past = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
    return { fromDate: past.toISOString().replace('T', ' ').slice(0, 19), toDate: '' }
  }
  return { fromDate: '', toDate: '' }
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<TimePreset>('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const value = useMemo(() => {
    let fromDate = customFrom
    let toDate = customTo
    if (!customFrom && !customTo) {
      const dates = computeDatesForPreset(preset)
      fromDate = dates.fromDate
      toDate = dates.toDate
    }
    const rangeKey = `${preset}:${fromDate || 'start'}..${toDate || 'end'}`
    const hasFilter = preset !== 'all' || Boolean(fromDate || toDate)

    return {
      preset,
      setPreset: (p: TimePreset) => {
        setCustomFrom('')
        setCustomTo('')
        setPresetState(p)
      },
      fromDate,
      toDate,
      setDateRange: (from: string, to: string) => {
        setCustomFrom(from)
        setCustomTo(to)
      },
      clearDateRange: () => {
        setCustomFrom('')
        setCustomTo('')
        setPresetState('all')
      },
      rangeKey,
      hasFilter,
    }
  }, [preset, customFrom, customTo])

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext)
  if (!ctx) {
    throw new Error('useDateRange must be used within a DateRangeProvider')
  }
  return ctx
}

