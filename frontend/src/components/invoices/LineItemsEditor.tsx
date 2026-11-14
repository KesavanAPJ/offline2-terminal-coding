import type { KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

import { EMPTY_LINE_ITEM, type InvoiceFormValues } from './invoiceFormSchema'
import { lineAmount } from './invoiceMath'

export interface LineItemsEditorProps {
  currency: string
  disabled?: boolean
}

const GRID = 'md:grid md:grid-cols-[minmax(0,1fr)_6rem_8.5rem_8.5rem_2.25rem] md:items-start md:gap-3'

/** Editable line items: description / qty / unit price / amount. Enter in the last price adds a row. */
export function LineItemsEditor({ currency, disabled = false }: LineItemsEditorProps) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<InvoiceFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = useWatch({ control, name: 'items' })

  const addRow = () => {
    append({ ...EMPTY_LINE_ITEM }, { shouldFocus: true, focusName: `items.${fields.length}.description` })
  }

  const handlePriceKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (index === fields.length - 1) addRow()
  }

  const rootError = errors.items?.root?.message ?? errors.items?.message

  return (
    <div className="space-y-3">
      <div className={cn(GRID, 'hidden px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid')}>
        <span>Description</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Unit price</span>
        <span className="text-right">Amount</span>
        <span className="sr-only">Actions</span>
      </div>

      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {fields.map((field, index) => {
            const rowErrors = errors.items?.[index]
            const amount = lineAmount(items?.[index] ?? EMPTY_LINE_ITEM)
            const descId = `item-${field.id}-description`
            const qtyId = `item-${field.id}-quantity`
            const priceId = `item-${field.id}-price`
            return (
              <motion.li
                key={field.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  GRID,
                  'grid grid-cols-2 gap-2 rounded-xl border bg-background/60 p-3 md:rounded-none md:border-0 md:bg-transparent md:p-1',
                )}
              >
                <div className="col-span-2 space-y-1 md:col-span-1">
                  <Label htmlFor={descId} className="text-xs text-muted-foreground md:sr-only">
                    Description
                  </Label>
                  <Input
                    id={descId}
                    placeholder="What did you do?"
                    autoComplete="off"
                    disabled={disabled}
                    aria-invalid={rowErrors?.description ? true : undefined}
                    {...register(`items.${index}.description`)}
                  />
                  {rowErrors?.description && (
                    <p className="text-xs text-destructive">{rowErrors.description.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={qtyId} className="text-xs text-muted-foreground md:sr-only">
                    Qty
                  </Label>
                  <Input
                    id={qtyId}
                    inputMode="decimal"
                    autoComplete="off"
                    className="text-right tabular"
                    disabled={disabled}
                    aria-invalid={rowErrors?.quantity ? true : undefined}
                    {...register(`items.${index}.quantity`)}
                  />
                  {rowErrors?.quantity && <p className="text-xs text-destructive">{rowErrors.quantity.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={priceId} className="text-xs text-muted-foreground md:sr-only">
                    Unit price
                  </Label>
                  <Input
                    id={priceId}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    className="text-right tabular"
                    disabled={disabled}
                    aria-invalid={rowErrors?.unit_price ? true : undefined}
                    onKeyDown={(event) => handlePriceKeyDown(event, index)}
                    {...register(`items.${index}.unit_price`)}
                  />
                  {rowErrors?.unit_price && <p className="text-xs text-destructive">{rowErrors.unit_price.message}</p>}
                </div>
                <div className="flex items-center justify-between md:block md:pt-2 md:text-right">
                  <span className="text-xs text-muted-foreground md:hidden">Amount</span>
                  <span className="text-sm font-medium tabular">{formatMoney(amount.toString(), currency)}</span>
                </div>
                <div className="flex justify-end md:pt-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    disabled={disabled || fields.length <= 1}
                    aria-label={`Remove line ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>

      {rootError && <p className="text-sm text-destructive">{rootError}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled}>
          <Plus aria-hidden="true" />
          Add line
        </Button>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Tip: press <kbd className="rounded border bg-muted px-1 font-mono">Enter</kbd> in the last price to add a line.
        </p>
      </div>
    </div>
  )
}
