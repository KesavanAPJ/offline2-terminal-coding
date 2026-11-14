import Decimal from 'decimal.js'

import { toDecimal } from '@/lib/format'
import type { DecimalString } from '@/types'

export interface LineInput {
  quantity: DecimalString
  unit_price: DecimalString
}

export interface InvoiceTotals {
  subtotal: Decimal
  discount: Decimal
  taxableAmount: Decimal
  taxAmount: Decimal
  total: Decimal
}

const MONEY_DP = 2

function money(value: Decimal): Decimal {
  return value.toDecimalPlaces(MONEY_DP, Decimal.ROUND_HALF_UP)
}

/** Parse loosely (blank / partial input like "12." -> best effort, invalid -> 0). */
function parseLoose(value: DecimalString | null | undefined): Decimal {
  if (value === null || value === undefined) return new Decimal(0)
  const trimmed = value.trim().replace(/\.$/, '')
  return toDecimal(trimmed)
}

/** qty × unit price, ROUND_HALF_UP to 0.01 (matches the server). */
export function lineAmount(item: LineInput): Decimal {
  return money(parseLoose(item.quantity).times(parseLoose(item.unit_price)))
}

/**
 * Live totals, mirroring `services/invoice_service.py`:
 * subtotal = Σ rounded line amounts; tax = (subtotal − discount) × rate; total = subtotal − discount + tax.
 */
export function computeTotals(items: LineInput[], discount: DecimalString, taxRateFraction: Decimal): InvoiceTotals {
  const subtotal = items.reduce((sum, item) => sum.plus(lineAmount(item)), new Decimal(0))
  const discountValue = money(Decimal.max(parseLoose(discount), 0))
  const taxableAmount = subtotal.minus(discountValue)
  const taxAmount = money(taxableAmount.times(taxRateFraction))
  const total = money(taxableAmount.plus(taxAmount))
  return { subtotal: money(subtotal), discount: discountValue, taxableAmount, taxAmount, total }
}

/** UI percent ("18") -> API fraction ("0.18"). Up to 4 decimal places (Numeric(5, 4)). */
export function percentToFraction(percent: DecimalString): DecimalString {
  return parseLoose(percent).dividedBy(100).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toString()
}

/** UI percent as a Decimal fraction for live math. */
export function percentToFractionDecimal(percent: DecimalString): Decimal {
  return parseLoose(percent).dividedBy(100)
}

/** API fraction ("0.1800") -> UI percent ("18"). */
export function fractionToPercent(fraction: DecimalString | null | undefined): DecimalString {
  return toDecimal(fraction).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()
}

/** Normalize a server decimal for editing ("1.00" -> "1", "12.50" -> "12.5"). */
export function decimalForInput(value: DecimalString | null | undefined): DecimalString {
  return toDecimal(value).toString()
}
