import { z } from 'zod'

import { addDaysISO, todayISO } from '@/lib/format'
import type { BusinessProfile, ClientSummary, Invoice, InvoiceCreate } from '@/types'

import { computeTotals, decimalForInput, fractionToPercent, percentToFraction, percentToFractionDecimal } from './invoiceMath'

const DECIMAL_2DP = /^\d+(\.\d{0,2})?$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_QUANTITY = 1_000_000
const MAX_MONEY = 9_999_999_999.99

function decimalField(label: string, opts: { min?: number; positive?: boolean; max: number; required: boolean }) {
  return z
    .string()
    .trim()
    .refine((v) => !opts.required || v !== '', { message: `${label} is required` })
    .refine((v) => v === '' || DECIMAL_2DP.test(v), { message: 'Use a number with up to 2 decimals' })
    .refine((v) => v === '' || !opts.positive || Number(v) > 0, { message: `${label} must be greater than 0` })
    .refine((v) => v === '' || Number(v) <= opts.max, { message: `${label} is too large` })
}

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(500, 'Keep it under 500 characters'),
  quantity: decimalField('Quantity', { positive: true, max: MAX_QUANTITY, required: true }),
  unit_price: decimalField('Price', { max: MAX_MONEY, required: true }),
})

export const invoiceFormSchema = z
  .object({
    client_id: z.number().int().positive().nullable(),
    issue_date: z.string().regex(ISO_DATE, 'Pick an issue date'),
    due_date: z.string().regex(ISO_DATE, 'Pick a due date'),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, 'Use a 3-letter code, e.g. USD'),
    tax_percent: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d+(\.\d{0,2})?$/.test(v), { message: 'Use a number, e.g. 18' })
      .refine((v) => v === '' || Number(v) <= 100, { message: 'Tax cannot exceed 100%' }),
    discount: decimalField('Discount', { max: MAX_MONEY, required: false }),
    notes: z.string().max(5000, 'Keep notes under 5000 characters'),
    items: z.array(lineItemSchema).min(1, 'Add at least one line item').max(100, 'Up to 100 line items'),
  })
  .superRefine((values, ctx) => {
    if (values.client_id === null) {
      ctx.addIssue({ code: 'custom', path: ['client_id'], message: 'Choose a client' })
    }
    if (ISO_DATE.test(values.issue_date) && ISO_DATE.test(values.due_date) && values.due_date < values.issue_date) {
      ctx.addIssue({ code: 'custom', path: ['due_date'], message: 'Due date cannot be before the issue date' })
    }
    const totals = computeTotals(values.items, values.discount, percentToFractionDecimal(values.tax_percent))
    if (totals.discount.greaterThan(totals.subtotal)) {
      ctx.addIssue({ code: 'custom', path: ['discount'], message: 'Discount cannot exceed the subtotal' })
    }
  })

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>
export type LineItemFormValues = z.infer<typeof lineItemSchema>

export const EMPTY_LINE_ITEM: LineItemFormValues = { description: '', quantity: '1', unit_price: '' }

export const FALLBACK_CURRENCY = 'USD'
export const FALLBACK_TERMS_DAYS = 14

/** Defaults for a new invoice, using business profile defaults when available. */
export function buildCreateDefaults(profile: BusinessProfile | undefined, client: ClientSummary | null): InvoiceFormValues {
  const issue = todayISO()
  const terms = profile?.default_payment_terms_days ?? FALLBACK_TERMS_DAYS
  return {
    client_id: client?.id ?? null,
    issue_date: issue,
    due_date: addDaysISO(issue, terms),
    currency: profile?.default_currency ?? FALLBACK_CURRENCY,
    tax_percent: '',
    discount: '',
    notes: '',
    items: [{ ...EMPTY_LINE_ITEM }],
  }
}

/** Prefill the form from an existing invoice. */
export function buildEditDefaults(invoice: Invoice): InvoiceFormValues {
  const items = [...invoice.items].sort((a, b) => a.position - b.position)
  const tax = fractionToPercent(invoice.tax_rate)
  const discount = decimalForInput(invoice.discount)
  return {
    client_id: invoice.client_id,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    currency: invoice.currency,
    tax_percent: tax === '0' ? '' : tax,
    discount: discount === '0' ? '' : discount,
    notes: invoice.notes ?? '',
    items:
      items.length > 0
        ? items.map((item) => ({
            description: item.description,
            quantity: decimalForInput(item.quantity),
            unit_price: decimalForInput(item.unit_price),
          }))
        : [{ ...EMPTY_LINE_ITEM }],
  }
}

/** Convert validated form values into the API payload. */
export function toInvoicePayload(values: InvoiceFormValues): InvoiceCreate {
  if (values.client_id === null) throw new Error('Choose a client')
  const notes = values.notes.trim()
  return {
    client_id: values.client_id,
    issue_date: values.issue_date,
    due_date: values.due_date,
    currency: values.currency.trim().toUpperCase(),
    tax_rate: percentToFraction(values.tax_percent || '0'),
    discount: values.discount.trim() || '0',
    notes: notes ? notes : null,
    items: values.items.map((item, index) => ({
      description: item.description.trim(),
      quantity: item.quantity.trim(),
      unit_price: item.unit_price.trim(),
      position: index,
    })),
  }
}
