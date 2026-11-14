import { z } from 'zod'

import type { BusinessProfile, BusinessProfileUpdate } from '@/types/settings'

// ---------------------------------------------------------------------------
// Constants (mirror backend validation in app/schemas/settings.py)
// ---------------------------------------------------------------------------

export const MAX_PAYMENT_TERMS_DAYS = 365
export const MAX_INVOICE_NUMBER = 2_147_483_647
export const INVOICE_PREFIX_MAX_LENGTH = 20

/** Default server limit is MAX_UPLOAD_SIZE_MB=2; the server re-checks regardless. */
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024

/** PNG, JPEG and WebP only. SVG is rejected server-side (it can carry scripts). */
export const ACCEPTED_LOGO_TYPES: Readonly<Record<string, readonly string[]>> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
}

export const ACCEPTED_LOGO_INPUT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp'

export interface CurrencyOption {
  code: string
  name: string
}

export const COMMON_CURRENCIES: readonly CurrencyOption[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
]

const CURRENCY_RE = /^[A-Za-z]{3}$/
const PREFIX_RE = /^[A-Za-z0-9\-_/#]*$/

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Whether `value` looks like an ISO-4217 code (3 letters, any case). */
export function isCurrencyCode(value: string): boolean {
  return CURRENCY_RE.test(value.trim())
}

/** Preview of the next invoice number, e.g. ("INV-", 7) → "INV-0007". */
export function formatInvoiceNumberPreview(prefix: string, nextNumber: number): string {
  const n = Number.isFinite(nextNumber) && nextNumber >= 1 ? Math.floor(nextNumber) : 1
  return `${prefix}${String(n).padStart(4, '0')}`
}

/** Trimmed string, or null when blank (clears the field server-side). */
function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Human-readable byte size, e.g. 2097152 → "2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

/** Client-side logo check (type, extension, size). Returns an error message or null. */
export function validateLogoFile(file: File): string | null {
  const name = file.name.toLowerCase()
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot) : ''
  if (ext === '.svg' || file.type === 'image/svg+xml') {
    return 'SVG logos are not supported. Please use a PNG, JPEG or WebP image.'
  }
  const allowed = ACCEPTED_LOGO_TYPES[file.type]
  if (!allowed || !allowed.includes(ext)) {
    return 'Unsupported file type. Please use a PNG, JPEG or WebP image.'
  }
  if (file.size === 0) return 'The selected file is empty.'
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return `The file is too large (maximum ${formatBytes(MAX_LOGO_SIZE_BYTES)}).`
  }
  return null
}

// ---------------------------------------------------------------------------
// Business profile form
// ---------------------------------------------------------------------------

const emailSchema = z.email()

export const businessProfileSchema = z.object({
  business_name: z.string().trim().max(255, 'Business name must be at most 255 characters'),
  email: z
    .string()
    .trim()
    .max(255, 'Email must be at most 255 characters')
    .refine((value) => value === '' || emailSchema.safeParse(value).success, 'Enter a valid email address'),
  phone: z.string().trim().max(50, 'Phone must be at most 50 characters'),
  address: z.string().trim().max(2000, 'Address must be at most 2000 characters'),
  tax_id: z.string().trim().max(64, 'Tax ID must be at most 64 characters'),
  payment_instructions: z.string().trim().max(5000, 'Payment instructions must be at most 5000 characters'),
})

export type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>

export function toBusinessProfileValues(profile: BusinessProfile): BusinessProfileFormValues {
  return {
    business_name: profile.business_name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    tax_id: profile.tax_id ?? '',
    payment_instructions: profile.payment_instructions ?? '',
  }
}

export function toBusinessProfilePayload(values: BusinessProfileFormValues): BusinessProfileUpdate {
  return {
    business_name: nullable(values.business_name),
    email: nullable(values.email),
    phone: nullable(values.phone),
    address: nullable(values.address),
    tax_id: nullable(values.tax_id),
    payment_instructions: nullable(values.payment_instructions),
  }
}

// ---------------------------------------------------------------------------
// Invoice defaults form
// ---------------------------------------------------------------------------

export const invoiceDefaultsSchema = z.object({
  default_currency: z
    .string()
    .trim()
    .refine((value) => CURRENCY_RE.test(value), 'Use a 3-letter ISO currency code, e.g. USD'),
  default_payment_terms_days: z
    .number({ error: 'Enter a number of days' })
    .int('Use a whole number of days')
    .min(0, 'Payment terms cannot be negative')
    .max(MAX_PAYMENT_TERMS_DAYS, `Payment terms must be at most ${MAX_PAYMENT_TERMS_DAYS} days`),
  invoice_prefix: z
    .string()
    .trim()
    .max(INVOICE_PREFIX_MAX_LENGTH, `Prefix must be at most ${INVOICE_PREFIX_MAX_LENGTH} characters`)
    .regex(PREFIX_RE, 'Only letters, digits and - _ / # are allowed'),
  next_invoice_number: z
    .number({ error: 'Enter a number' })
    .int('Use a whole number')
    .min(1, 'Must be at least 1')
    .max(MAX_INVOICE_NUMBER, 'Number is too large'),
})

export type InvoiceDefaultsFormValues = z.infer<typeof invoiceDefaultsSchema>

export function toInvoiceDefaultsValues(profile: BusinessProfile): InvoiceDefaultsFormValues {
  return {
    default_currency: profile.default_currency,
    default_payment_terms_days: profile.default_payment_terms_days,
    invoice_prefix: profile.invoice_prefix,
    next_invoice_number: profile.next_invoice_number,
  }
}

export function toInvoiceDefaultsPayload(values: InvoiceDefaultsFormValues): BusinessProfileUpdate {
  return {
    default_currency: values.default_currency.trim().toUpperCase(),
    default_payment_terms_days: values.default_payment_terms_days,
    invoice_prefix: values.invoice_prefix.trim(),
    next_invoice_number: values.next_invoice_number,
  }
}
