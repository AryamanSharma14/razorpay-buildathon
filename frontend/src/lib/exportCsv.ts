/**
 * Client-side CSV export helper.
 * Formats an array of records into a valid CSV and triggers browser download.
 */
export function exportCsv<T>(
  filename: string,
  columns: { key: keyof T | string; label: string; format?: (val: unknown, row: T) => string }[],
  rows: T[],
): void {
  if (!rows || rows.length === 0) return

  const headerRow = columns.map((col) => escapeCsvCell(col.label)).join(',')

  const bodyRows = rows.map((row) =>
    columns
      .map((col) => {
        const key = col.key as keyof T
        const raw = row && typeof row === 'object' && key in row ? row[key] : undefined
        const formatted = col.format ? col.format(raw, row) : raw != null ? String(raw) : ''
        return escapeCsvCell(formatted)
      })
      .join(','),
  )

  const csvContent = [headerRow, ...bodyRows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function escapeCsvCell(value: string): string {
  if (value == null) return '""'
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

