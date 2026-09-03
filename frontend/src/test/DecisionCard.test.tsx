import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { DecisionCard } from '../components/common/DecisionCard'

describe('DecisionCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders soft decline with UPI rail switch and salary timing', () => {
    const event = {
      payment_id: 'pay_soft_123',
      amount_paise: 420000,
      classification: 'soft',
      error_reason: 'insufficient_funds',
      method: 'card',
      chosen_rail: 'upi',
      confidence: 0.72,
    }

    render(<DecisionCard event={event} />)

    expect(screen.getByText('pay_soft_123')).toBeDefined()
    expect(screen.getByText('Yes — Safe to retry (temporary low balance)')).toBeDefined()
    expect(screen.getByText(/UPI Autopay on WhatsApp/i)).toBeDefined()
    expect(screen.getByText(/Timing Radar/i)).toBeDefined()
  })

  it('renders hard decline with permanent stop and fine protection', () => {
    const event = {
      payment_id: 'pay_hard_456',
      amount_paise: 150000,
      classification: 'hard',
      error_reason: 'card_expired',
      method: 'card',
      chosen_rail: 'card',
    }

    const audit = [
      { id: 1, payment_id: 'pay_hard_456', action: 'hard_guard', detail: 'Cat-1 stop', ts: '2026-08-28T00:00:00' }
    ]

    render(<DecisionCard event={event} audit={audit} />)

    expect(screen.getByText(/Blocked immediately \(expired card\)/i)).toBeDefined()
    expect(screen.getByText(/saved ₹8.30 in Visa penalty fees/i)).toBeDefined()
  })

  it('renders negative EV skip for micro-payment', () => {
    const event = {
      payment_id: 'pay_ev_789',
      amount_paise: 1, // ₹0.01
      classification: 'soft',
      error_reason: 'insufficient_funds',
      method: 'card',
      chosen_rail: 'card',
    }

    render(<DecisionCard event={event} />)

    expect(screen.getByText('pay_ev_789')).toBeDefined()
    expect(screen.getByText('1. Is it safe to retry?')).toBeDefined()
  })
})
