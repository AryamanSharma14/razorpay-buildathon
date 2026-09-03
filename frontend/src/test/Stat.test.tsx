import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Stat } from '../components/common/Stat'

describe('Stat', () => {
  beforeEach(() => {
    // Mock matchMedia for reduced motion check
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true, // test immediate render under reduced motion
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('renders numeric values with prefix and suffix', () => {
    render(<Stat value={1500} prefix="₹" suffix=" recovered" />)
    expect(screen.getByText('₹1,500 recovered')).toBeDefined()
  })

  it('renders decimal numbers with precision', () => {
    render(<Stat value={45.5} suffix="%" decimals={1} />)
    expect(screen.getByText('45.5%')).toBeDefined()
  })

  it('renders string values directly if non-numeric', () => {
    render(<Stat value="N/A" />)
    expect(screen.getByText('N/A')).toBeDefined()
  })
})

