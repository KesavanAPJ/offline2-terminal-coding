import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney, toDecimal } from '@/lib/format'

describe('format helpers', () => {
  it('formats money strings with currency', () => {
    expect(formatMoney('1234.5', 'USD', 'en-US')).toBe('$1,234.50')
  })

  it('handles invalid amounts as zero', () => {
    expect(toDecimal('abc').toString()).toBe('0')
  })

  it('formats ISO dates without timezone shifting', () => {
    expect(formatDate('2026-01-05', 'en-US')).toBe('Jan 5, 2026')
  })
})
