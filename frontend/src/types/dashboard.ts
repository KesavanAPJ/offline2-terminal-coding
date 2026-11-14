import type { CurrencyCode, DecimalString, MoneyAmount } from './common'
import type { InvoiceListItem, InvoiceStatus } from './invoice'

/** GET /dashboard/summary — totals grouped per currency. */
export interface DashboardSummary {
  paid_totals: MoneyAmount[]
  /** sent + overdue */
  outstanding_totals: MoneyAmount[]
  overdue_totals: MoneyAmount[]
  counts: Record<InvoiceStatus, number>
}

/** GET /dashboard/recent */
export type RecentInvoice = InvoiceListItem

/** GET /dashboard/revenue?months=12 (post-MVP). `month` is "YYYY-MM". */
export interface RevenuePoint {
  month: string
  currency: CurrencyCode
  amount: DecimalString
}

/** GET /dashboard/top-clients (post-MVP). */
export interface TopClient {
  client_id: number
  name: string
  currency: CurrencyCode
  amount: DecimalString
  invoice_count: number
}
