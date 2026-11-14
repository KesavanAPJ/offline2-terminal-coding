import { z } from 'zod'

import type { ClientCreate } from '@/types'

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`)

const emailSchema = z.email()

export const clientFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  email: z
    .string()
    .trim()
    .max(255, 'Email must be at most 255 characters')
    .refine((value) => value === '' || emailSchema.safeParse(value).success, 'Enter a valid email address'),
  company: optionalText(200, 'Company'),
  phone: optionalText(50, 'Phone'),
  address: optionalText(1000, 'Address'),
  tax_id: optionalText(100, 'Tax ID'),
  notes: optionalText(5000, 'Notes'),
})

export type ClientFormValues = z.infer<typeof clientFormSchema>

/** Map API-shaped (nullable) defaults into the all-string form state. */
export function toFormValues(defaults: Partial<ClientCreate> | undefined): ClientFormValues {
  return {
    name: defaults?.name ?? '',
    email: defaults?.email ?? '',
    company: defaults?.company ?? '',
    phone: defaults?.phone ?? '',
    address: defaults?.address ?? '',
    tax_id: defaults?.tax_id ?? '',
    notes: defaults?.notes ?? '',
  }
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Form state -> API payload (trimmed; empty strings become null). Compact mode only sends its 3 fields. */
export function toClientPayload(values: ClientFormValues, compact = false): ClientCreate {
  const payload: ClientCreate = {
    name: values.name.trim(),
    email: emptyToNull(values.email),
    company: emptyToNull(values.company),
  }
  if (!compact) {
    payload.phone = emptyToNull(values.phone)
    payload.address = emptyToNull(values.address)
    payload.tax_id = emptyToNull(values.tax_id)
    payload.notes = emptyToNull(values.notes)
  }
  return payload
}
