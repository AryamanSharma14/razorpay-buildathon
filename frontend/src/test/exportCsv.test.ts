import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportCsv } from '../lib/exportCsv'

describe('exportCsv', () => {
  let createdUrl = ''
  let clicked = false
  let appendedElement: HTMLAnchorElement | null = null

  beforeEach(() => {
    clicked = false
    createdUrl = ''
    appendedElement = null

    // Mock window.URL.createObjectURL / revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => {
      createdUrl = 'blob:test-url'
      return createdUrl
    })
    window.URL.revokeObjectURL = vi.fn()

    // Mock document.createElement and body methods
    vi.spyOn(document.body, 'appendChild').mockImplementation((el: Node) => {
      appendedElement = el as HTMLAnchorElement
      return el
    })
    vi.spyOn(document.body, 'removeChild').mockImplementation((el: Node) => el)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      clicked = true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates valid CSV and triggers download', () => {
    const rows = [
      { id: 'pay_1', amount: 500, reason: 'insufficient_funds' },
      { id: 'pay_2', amount: 1200, reason: 'card_expired' },
    ]

    exportCsv(
      'test_export',
      [
        { key: 'id', label: 'Payment ID' },
        { key: 'amount', label: 'Amount' },
        { key: 'reason', label: 'Reason' },
      ],
      rows
    )

    expect(window.URL.createObjectURL).toHaveBeenCalled()
    expect(clicked).toBe(true)
    expect(appendedElement?.download).toBe('test_export.csv')
  })

  it('escapes cells containing commas, quotes, and newlines', () => {
    const rows = [
      { id: 'pay_3', text: 'hello, world', note: 'quote "inside"' },
    ]

    exportCsv(
      'escaped_export',
      [
        { key: 'id', label: 'ID' },
        { key: 'text', label: 'Text' },
        { key: 'note', label: 'Note' },
      ],
      rows
    )

    expect(clicked).toBe(true)
  })

  it('handles empty rows gracefully', () => {
    exportCsv('empty', [{ key: 'id', label: 'ID' }], [])
    expect(clicked).toBe(false)
  })
})

