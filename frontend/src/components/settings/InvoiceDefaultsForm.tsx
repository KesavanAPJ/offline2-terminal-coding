import { useId, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Hash, Save } from 'lucide-react'
import { toast } from 'sonner'

import { AnimatedInput } from '@/components/ui/AnimatedInput'
import { GradientButton } from '@/components/ui/GradientButton'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/services/api'
import type { BusinessProfile } from '@/types/settings'

import { CurrencyCombobox } from './CurrencyCombobox'
import {
  INVOICE_PREFIX_MAX_LENGTH,
  MAX_PAYMENT_TERMS_DAYS,
  formatInvoiceNumberPreview,
  invoiceDefaultsSchema,
  toInvoiceDefaultsPayload,
  toInvoiceDefaultsValues,
  type InvoiceDefaultsFormValues,
} from './settingsSchemas'
import { useUpdateBusinessProfile } from './useSettingsMutations'

export interface InvoiceDefaultsFormProps {
  profile: BusinessProfile
}

/** Defaults applied to new invoices: currency, payment terms and numbering. */
export function InvoiceDefaultsForm({ profile }: InvoiceDefaultsFormProps) {
  const currencyId = useId()
  const currencyMessageId = `${currencyId}-message`
  const values = useMemo(() => toInvoiceDefaultsValues(profile), [profile])

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<InvoiceDefaultsFormValues>({
    resolver: zodResolver(invoiceDefaultsSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  })

  const prefix = useWatch({ control, name: 'invoice_prefix' })
  const nextNumber = useWatch({ control, name: 'next_invoice_number' })
  const preview = formatInvoiceNumberPreview(prefix ?? '', nextNumber)

  const mutation = useUpdateBusinessProfile()

  const onSubmit = (formValues: InvoiceDefaultsFormValues): void => {
    mutation.mutate(toInvoiceDefaultsPayload(formValues), {
      onSuccess: (updated) => {
        reset(toInvoiceDefaultsValues(updated))
        toast.success('Invoice defaults saved')
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, 'Could not save your invoice defaults.'))
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={currencyId}>Default currency</Label>
          <Controller
            control={control}
            name="default_currency"
            render={({ field }) => (
              <CurrencyCombobox
                ref={field.ref}
                id={currencyId}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(errors.default_currency)}
                aria-describedby={currencyMessageId}
              />
            )}
          />
          {errors.default_currency ? (
            <p id={currencyMessageId} className="text-sm text-destructive">
              {errors.default_currency.message}
            </p>
          ) : (
            <p id={currencyMessageId} className="text-sm text-muted-foreground">
              Pick a common currency or type any ISO-4217 code.
            </p>
          )}
        </div>

        <AnimatedInput
          label="Payment terms (days)"
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_PAYMENT_TERMS_DAYS}
          step={1}
          hint="Due date = issue date + this many days. Use 0 for due on receipt."
          error={errors.default_payment_terms_days?.message}
          {...register('default_payment_terms_days', { valueAsNumber: true })}
        />

        <AnimatedInput
          label="Invoice number prefix"
          maxLength={INVOICE_PREFIX_MAX_LENGTH}
          placeholder="INV-"
          autoComplete="off"
          hint="Letters, digits and - _ / # (max 20)."
          error={errors.invoice_prefix?.message}
          {...register('invoice_prefix')}
        />

        <AnimatedInput
          label="Next invoice number"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          hint="Used for the next invoice you create."
          error={errors.next_invoice_number?.message}
          {...register('next_invoice_number', { valueAsNumber: true })}
        />
      </div>

      <div
        className="flex items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3"
        aria-live="polite"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Hash className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Next invoice preview</p>
          <p className="truncate font-mono text-lg font-semibold">{preview}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <GradientButton type="submit" loading={mutation.isPending} disabled={!isDirty}>
          {!mutation.isPending && <Save aria-hidden="true" />}
          Save defaults
        </GradientButton>
      </div>
    </form>
  )
}

export default InvoiceDefaultsForm
