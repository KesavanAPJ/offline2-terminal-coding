import { parseISODate } from '@/lib/format'
import type { ISODate, ISODateTime } from '@/types'

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "3 days ago" / "in 2 weeks" for a date or datetime; "just now" under a minute. */
export function formatRelative(value: ISODate | ISODateTime | null | undefined, now: Date = new Date()): string {
  if (!value) return '—'
  const date = value.length <= 10 ? parseISODate(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

/** Whole days between a past ISO date and today (0 when not in the past). */
export function daysSince(value: ISODate, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((today.getTime() - parseISODate(value).getTime()) / (24 * 3600 * 1000))
  return Math.max(diff, 0)
}
