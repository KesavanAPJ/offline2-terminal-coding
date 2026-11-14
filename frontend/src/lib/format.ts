import Decimal from 'decimal.js'

import type { DecimalString, ISODate, ISODateTime, MoneyAmount } from '@/types'

Decimal.set({ rounding: Decimal.ROUND_HALF_UP })

/** Parse a decimal string safely; invalid/empty input becomes 0. */
export function toDecimal(value: DecimalString | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return new Decimal(0)
  try {
    return new Decimal(value)
  } catch {
    return new Decimal(0)
  }
}

/** Format a decimal money string in the given currency, e.g. ("1234.5", "USD") -> "$1,234.50". */
export function formatMoney(
  amount: DecimalString | number | null | undefined,
  currency: string,
  locale?: string,
): string {
  const value = toDecimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value.toNumber())
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

/** Format a list of per-currency totals, e.g. "$1,200.00 + €300.00". Empty -> zero in fallback currency. */
export function formatMoneyList(amounts: MoneyAmount[], fallbackCurrency = 'USD', locale?: string): string {
  if (amounts.length === 0) return formatMoney('0', fallbackCurrency, locale)
  return amounts.map((m) => formatMoney(m.amount, m.currency, locale)).join(' + ')
}

/** Rate string "0.2000" -> "20%". */
export function formatPercent(rate: DecimalString | null | undefined, locale?: string): string {
  const value = toDecimal(rate).toNumber()
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(value)
}

/** Parse "YYYY-MM-DD" as a local calendar date (avoids UTC off-by-one). */
export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** "2026-01-05" -> "Jan 5, 2026". Accepts datetimes too. */
export function formatDate(value: ISODate | ISODateTime | null | undefined, locale?: string): string {
  if (!value) return '—'
  const date = value.length <= 10 ? parseISODate(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

/** Datetime with time, e.g. "Jan 5, 2026, 3:04 PM". */
export function formatDateTime(value: ISODateTime | null | undefined, locale?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

/** Today's local date as "YYYY-MM-DD". */
export function todayISO(): ISODate {
  return toISODate(new Date())
}

/** Local Date -> "YYYY-MM-DD". */
export function toISODate(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Add days to an ISO date. */
export function addDaysISO(value: ISODate, days: number): ISODate {
  const date = parseISODate(value)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Initials for avatars, e.g. "Jane Doe" -> "JD". */
export function initials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return '?'
  const base = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0] : nameOrEmail
  const parts = base.trim().split(/[\s._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : base.slice(0, 2)
  return letters.toUpperCase()
}
