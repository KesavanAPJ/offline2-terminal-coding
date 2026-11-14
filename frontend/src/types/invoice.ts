import type { ClientSummary } from './client'
import type { CurrencyCode, DecimalString, ISODate, ISODateTime, PageParams } from './common'
import type { PublicBusinessProfile } from './settings'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export const INVOICE_STATUSES: readonly InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue'] as const

export interface InvoiceItem {
  id: number
  description: string
  quantity: DecimalString
  unit_price: DecimalString
  amount: DecimalString
  position: number
}

/** Line item as sent by the client on create/update (server computes `amount`). */
export interface InvoiceItemInput {
  description: string
  quantity: DecimalString
  unit_price: DecimalString
  position?: number
}

export interface Invoice {
  id: number
  client_id: number
  client: ClientSummary
  invoice_number: string
  issue_date: ISODate
  due_date: ISODate
  status: InvoiceStatus
  currency: CurrencyCode
  /** Fraction, e.g. "0.2000" for 20%. */
  tax_rate: DecimalString
  discount: DecimalString
  subtotal: DecimalString
  tax_amount: DecimalString
  total: DecimalString
  notes: string | null
  public_token: string | null
  public_url?: string | null
  sent_at: ISODateTime | null
  paid_at: ISODateTime | null
  created_at: ISODateTime
  updated_at: ISODateTime
  items: InvoiceItem[]
}

/** POST /invoices — server allocates number and computes totals. Omitted fields use business defaults. */
export interface InvoiceCreate {
  client_id: number
  issue_date?: ISODate
  due_date?: ISODate
  currency?: CurrencyCode
  tax_rate?: DecimalString
  discount?: DecimalString
  notes?: string | null
  items: InvoiceItemInput[]
}

/** PUT /invoices/{id} — full edit only allowed while draft. */
export type InvoiceUpdate = Partial<InvoiceCreate>

/** Row in GET /invoices and dashboard "recent". */
export interface InvoiceListItem {
  id: number
  invoice_number: string
  client: ClientSummary
  issue_date: ISODate
  due_date: ISODate
  status: InvoiceStatus
  currency: CurrencyCode
  total: DecimalString
  sent_at: ISODateTime | null
  paid_at: ISODateTime | null
  created_at: ISODateTime
}

/** GET /invoices query params. */
export interface InvoiceListParams extends PageParams {
  status?: InvoiceStatus
  client_id?: number
  from?: ISODate
  to?: ISODate
}

/** POST /invoices/{id}/send and /revoke-link response. */
export interface SendInvoiceResponse {
  invoice: Invoice
  public_url: string
}

/** Client details shown on the public invoice. */
export interface PublicInvoiceClient {
  name: string
  email: string | null
  company: string | null
  address: string | null
  tax_id: string | null
}

export interface PublicInvoiceItem {
  description: string
  quantity: DecimalString
  unit_price: DecimalString
  amount: DecimalString
  position: number
}

/** GET /public/invoices/{token} — no internal ids, no user_id. */
export interface PublicInvoice {
  invoice_number: string
  issue_date: ISODate
  due_date: ISODate
  status: InvoiceStatus
  currency: CurrencyCode
  tax_rate: DecimalString
  discount: DecimalString
  subtotal: DecimalString
  tax_amount: DecimalString
  total: DecimalString
  notes: string | null
  paid_at: ISODateTime | null
  client: PublicInvoiceClient
  items: PublicInvoiceItem[]
  business: PublicBusinessProfile
}
