import type { CurrencyCode, ISODateTime } from './common'

export interface BusinessProfile {
  id: number
  business_name: string | null
  logo_file_id: number | null
  /** Absolute or API-relative URL to the logo (GET /files/{id}), null when no logo. */
  logo_url: string | null
  address: string | null
  email: string | null
  phone: string | null
  tax_id: string | null
  default_currency: CurrencyCode
  default_payment_terms_days: number
  invoice_prefix: string
  next_invoice_number: number
  payment_instructions: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

/** PUT /settings/business */
export interface BusinessProfileUpdate {
  business_name?: string | null
  address?: string | null
  email?: string | null
  phone?: string | null
  tax_id?: string | null
  default_currency?: CurrencyCode
  default_payment_terms_days?: number
  invoice_prefix?: string
  next_invoice_number?: number
  payment_instructions?: string | null
}

/** Stored upload metadata. */
export interface FileUpload {
  id: number
  filename: string
  content_type: string
  size_bytes: number
  created_at: ISODateTime
}

/** Subset of the business profile exposed on public invoice pages. */
export interface PublicBusinessProfile {
  business_name: string | null
  logo_url: string | null
  address: string | null
  email: string | null
  phone: string | null
  tax_id: string | null
  payment_instructions: string | null
}
