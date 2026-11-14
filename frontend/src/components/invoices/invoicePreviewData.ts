import type {
  BusinessProfile,
  CurrencyCode,
  DecimalString,
  Invoice,
  InvoiceStatus,
  ISODate,
  ISODateTime,
  PublicBusinessProfile,
  PublicInvoice,
} from '@/types'

export interface InvoicePreviewParty {
  name: string
  company?: string | null
  email?: string | null
  address?: string | null
  tax_id?: string | null
}

export interface InvoicePreviewItem {
  description: string
  quantity: DecimalString
  unit_price: DecimalString
  amount: DecimalString
}

/** Plain data rendered by `InvoicePreview` (built from an authenticated Invoice or a PublicInvoice). */
export interface InvoicePreviewData {
  invoiceNumber: string
  status: InvoiceStatus
  issueDate: ISODate
  dueDate: ISODate
  currency: CurrencyCode
  /** Fraction, e.g. "0.18". */
  taxRate: DecimalString
  discount: DecimalString
  subtotal: DecimalString
  taxAmount: DecimalString
  total: DecimalString
  notes: string | null
  paidAt: ISODateTime | null
  business: PublicBusinessProfile | null
  client: InvoicePreviewParty
  items: InvoicePreviewItem[]
}

function toPublicBusiness(profile: BusinessProfile | null | undefined): PublicBusinessProfile | null {
  if (!profile) return null
  return {
    business_name: profile.business_name,
    logo_url: profile.logo_url,
    address: profile.address,
    email: profile.email,
    phone: profile.phone,
    tax_id: profile.tax_id,
    payment_instructions: profile.payment_instructions,
  }
}

export function previewFromInvoice(invoice: Invoice, profile: BusinessProfile | null | undefined): InvoicePreviewData {
  return {
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    currency: invoice.currency,
    taxRate: invoice.tax_rate,
    discount: invoice.discount,
    subtotal: invoice.subtotal,
    taxAmount: invoice.tax_amount,
    total: invoice.total,
    notes: invoice.notes,
    paidAt: invoice.paid_at,
    business: toPublicBusiness(profile),
    client: {
      name: invoice.client.name,
      company: invoice.client.company,
      email: invoice.client.email,
    },
    items: [...invoice.items].sort((a, b) => a.position - b.position),
  }
}

export function previewFromPublic(invoice: PublicInvoice): InvoicePreviewData {
  return {
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    currency: invoice.currency,
    taxRate: invoice.tax_rate,
    discount: invoice.discount,
    subtotal: invoice.subtotal,
    taxAmount: invoice.tax_amount,
    total: invoice.total,
    notes: invoice.notes,
    paidAt: invoice.paid_at,
    business: invoice.business,
    client: invoice.client,
    items: [...invoice.items].sort((a, b) => a.position - b.position),
  }
}
