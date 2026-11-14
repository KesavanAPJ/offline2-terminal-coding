import { useState, type KeyboardEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientButton } from '@/components/ui/GradientButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { addDaysISO } from '@/lib/format'
import type { ClientSummary, InvoiceCreate } from '@/types'

import { ClientCombobox } from './ClientCombobox'
import { invoiceFormSchema, toInvoicePayload, type InvoiceFormValues } from './invoiceFormSchema'
import { computeTotals, percentToFractionDecimal } from './invoiceMath'
import { LineItemsEditor } from './LineItemsEditor'
import { TotalsSummary } from './TotalsSummary'

export type InvoiceSubmitIntent = 'draft' | 'send'

export interface InvoiceFormProps {
  defaultValues: InvoiceFormValues
  initialClient: ClientSummary | null
  /** Business default payment terms, used to recompute the due date when the issue date changes. */
  paymentTermsDays: number
  mode: 'create' | 'edit'
  /** Persist the invoice. Reject to keep the form editable (the caller shows the error). */
  onSubmit: (payload: InvoiceCreate, intent: InvoiceSubmitIntent) => Promise<void>
  onCancel?: () => void
}

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CHF', 'SGD', 'AED', 'NZD', 'ZAR']

function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** The invoice editor ("under a minute" flow): client, dates, line items, totals, Save draft / Save & send. */
export function InvoiceForm({ defaultValues, initialClient, paymentTermsDays, mode, onSubmit, onCancel }: InvoiceFormProps) {
  const form = useForm<InvoiceFormValues, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { control, register, handleSubmit, setValue, setFocus, formState } = form
  const { errors } = formState

  const [client, setClient] = useState<ClientSummary | null>(initialClient)
  const [pending, setPending] = useState<InvoiceSubmitIntent | null>(null)
  // In edit mode keep the stored due date unless the user changes the issue date deliberately.
  const [dueDateEdited, setDueDateEdited] = useState(mode === 'edit')

  const [items, discount, taxPercent, currency] = useWatch({
    control,
    name: ['items', 'discount', 'tax_percent', 'currency'],
  })
  const totals = computeTotals(items ?? [], discount ?? '', percentToFractionDecimal(taxPercent ?? ''))
  const displayCurrency = /^[A-Za-z]{3}$/.test(currency ?? '') ? currency.toUpperCase() : 'USD'

  const submit = (intent: InvoiceSubmitIntent) =>
    handleSubmit(async (values) => {
      setPending(intent)
      try {
        await onSubmit(toInvoicePayload(values), intent)
      } catch {
        // The caller reports the error; keep the form as-is so nothing is lost.
      } finally {
        setPending(null)
      }
    })

  const busy = pending !== null

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter') return
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      if (!busy) void submit('send')()
      return
    }
    // Plain Enter inside an input must not submit the form (line items handle it themselves).
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT') event.preventDefault()
  }

  const focusFirstItem = (source: 'list' | 'created') => {
    // Quick-add closes a dialog that restores focus when its exit animation ends; wait for it.
    window.setTimeout(() => setFocus('items.0.description'), source === 'created' ? 260 : 10)
  }

  const issueField = register('issue_date', {
    onChange: (event: { target: { value: string } }) => {
      const next = event.target.value
      if (!dueDateEdited && isISODate(next)) {
        setValue('due_date', addDaysISO(next, paymentTermsDays), { shouldValidate: formState.isSubmitted })
      }
    },
  })
  const dueField = register('due_date', {
    onChange: () => setDueDateEdited(true),
  })

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!busy) void submit('draft')()
        }}
        onKeyDown={handleKeyDown}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div className="space-y-6">
          <GlassCard static className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="invoice-client">Client</Label>
              <Controller
                control={control}
                name="client_id"
                render={({ field, fieldState }) => (
                  <ClientCombobox
                    ref={field.ref}
                    id="invoice-client"
                    value={client}
                    autoFocus={mode === 'create' && !initialClient}
                    disabled={busy}
                    invalid={Boolean(fieldState.error)}
                    onChange={(next) => {
                      setClient(next)
                      field.onChange(next.id)
                    }}
                    onSelected={focusFirstItem}
                  />
                )}
              />
              {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="invoice-issue-date">Issue date</Label>
                <Input id="invoice-issue-date" type="date" disabled={busy} aria-invalid={errors.issue_date ? true : undefined} {...issueField} />
                {errors.issue_date && <p className="text-sm text-destructive">{errors.issue_date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-due-date">Due date</Label>
                <Input id="invoice-due-date" type="date" disabled={busy} aria-invalid={errors.due_date ? true : undefined} {...dueField} />
                {errors.due_date && <p className="text-sm text-destructive">{errors.due_date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-currency">Currency</Label>
                <Input
                  id="invoice-currency"
                  list="invoice-currency-options"
                  maxLength={3}
                  autoComplete="off"
                  className="uppercase"
                  disabled={busy}
                  aria-invalid={errors.currency ? true : undefined}
                  {...register('currency')}
                />
                <datalist id="invoice-currency-options">
                  {COMMON_CURRENCIES.map((code) => (
                    <option key={code} value={code} />
                  ))}
                </datalist>
                {errors.currency && <p className="text-sm text-destructive">{errors.currency.message}</p>}
              </div>
            </div>
          </GlassCard>

          <GlassCard static className="space-y-4">
            <h2 className="text-base font-semibold">Line items</h2>
            <LineItemsEditor currency={displayCurrency} disabled={busy} />
          </GlassCard>

          <GlassCard static className="space-y-2">
            <Label htmlFor="invoice-notes">Notes</Label>
            <Textarea
              id="invoice-notes"
              rows={3}
              placeholder="Thanks for your business! (shown on the invoice)"
              disabled={busy}
              aria-invalid={errors.notes ? true : undefined}
              {...register('notes')}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </GlassCard>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <GlassCard static className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="invoice-tax">Tax %</Label>
                <Input
                  id="invoice-tax"
                  inputMode="decimal"
                  placeholder="0"
                  autoComplete="off"
                  className="text-right tabular"
                  disabled={busy}
                  aria-invalid={errors.tax_percent ? true : undefined}
                  {...register('tax_percent')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-discount">Discount</Label>
                <Input
                  id="invoice-discount"
                  inputMode="decimal"
                  placeholder="0.00"
                  autoComplete="off"
                  className="text-right tabular"
                  disabled={busy}
                  aria-invalid={errors.discount ? true : undefined}
                  {...register('discount')}
                />
              </div>
              {(errors.tax_percent || errors.discount) && (
                <p className="col-span-2 text-sm text-destructive">
                  {errors.tax_percent?.message ?? errors.discount?.message}
                </p>
              )}
            </div>

            <TotalsSummary
              currency={displayCurrency}
              subtotal={totals.subtotal.toString()}
              discount={totals.discount.toString()}
              taxPercent={(taxPercent ?? '').trim()}
              taxAmount={totals.taxAmount.toString()}
              total={totals.total.toString()}
            />

            <div className="flex flex-col gap-2">
              <GradientButton
                type="button"
                size="lg"
                className="w-full"
                loading={pending === 'send'}
                disabled={busy}
                onClick={() => void submit('send')()}
              >
                {pending !== 'send' && <Send aria-hidden="true" />}
                Save &amp; send
              </GradientButton>
              <Button type="submit" variant="outline" className="w-full" disabled={busy}>
                {pending === 'draft' ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save draft'}
              </Button>
              {onCancel && (
                <Button type="button" variant="ghost" className="w-full" onClick={onCancel} disabled={busy}>
                  Cancel
                </Button>
              )}
              <p className="text-center text-xs text-muted-foreground">
                <kbd className="rounded border bg-muted px-1 font-mono">Ctrl</kbd> +{' '}
                <kbd className="rounded border bg-muted px-1 font-mono">Enter</kbd> to save &amp; send
              </p>
            </div>
          </GlassCard>
        </div>
      </form>
    </FormProvider>
  )
}
