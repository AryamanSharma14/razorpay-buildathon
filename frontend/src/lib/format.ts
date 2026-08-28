const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const INR2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

export function inr(value: number | null | undefined, opts?: { from?: 'paise' | 'inr'; decimals?: boolean }) {
  if (value == null || Number.isNaN(value)) return '—'
  const rupees = opts?.from === 'paise' ? value / 100 : value
  return '₹' + (opts?.decimals ? INR2 : INR).format(rupees)
}

export function pct(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toFixed(digits) + '%'
}

// Backend timestamps are naive UTC (sqlite datetime('now') / isoformat without tz).
function parseUtc(iso: string): Date {
  const hasTz = /[zZ]|[+-]\d\d:?\d\d$/.test(iso)
  return new Date(hasTz ? iso : iso.replace(' ', 'T') + 'Z')
}

export function dt(iso: string | null | undefined) {
  if (!iso) return '—'
  return parseUtc(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export function ago(iso: string | null | undefined) {
  if (!iso) return '—'
  const diff = parseUtc(iso).getTime() - Date.now()
  const abs = Math.abs(diff)
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60_000, 'second'],
    [3_600_000, 'minute'],
    [86_400_000, 'hour'],
    [Infinity, 'day'],
  ]
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const divisors = [1000, 60_000, 3_600_000, 86_400_000]
  for (let i = 0; i < units.length; i++) {
    if (abs < units[i][0]) return rtf.format(Math.round(diff / divisors[i]), units[i][1])
  }
  return dt(iso)
}
