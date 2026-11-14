import type { ISODateTime, MoneyAmount, PageParams } from './common'

export interface Client {
  id: number
  name: string
  email: string | null
  company: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
  notes: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

/** Compact client representation embedded in invoices. */
export interface ClientSummary {
  id: number
  name: string
  email: string | null
  company: string | null
}

/** POST /clients */
export interface ClientCreate {
  name: string
  email?: string | null
  company?: string | null
  phone?: string | null
  address?: string | null
  tax_id?: string | null
  notes?: string | null
}

/** PUT /clients/{id} */
export type ClientUpdate = Partial<ClientCreate>

/** Client plus aggregated invoice stats (detail page). */
export interface ClientWithStats extends Client {
  invoice_count: number
  paid_totals: MoneyAmount[]
  outstanding_totals: MoneyAmount[]
}

/** GET /clients query params. */
export interface ClientListParams extends PageParams {
  q?: string
}
