import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DecimalString } from '@/types'

export interface TotalsSummaryProps {
  currency: string
  subtotal: DecimalString
  discount: DecimalString
  /** Tax rate shown as a percent label, e.g. "18". Empty/0 hides the percent. */
  taxPercent: DecimalString
  taxAmount: DecimalString
  total: DecimalString
  className?: string
}

/** Live subtotal / discount / tax / total (display only — the server computes the stored values). */
export function TotalsSummary({ currency, subtotal, discount, taxPercent, taxAmount, total, className }: TotalsSummaryProps) {
  const hasDiscount = discount !== '0' && discount !== '0.00' && discount !== ''
  const taxLabel = taxPercent && taxPercent !== '0' ? `Tax (${taxPercent}%)` : 'Tax'
  return (
    <dl className={cn('space-y-2 text-sm', className)} aria-live="polite">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="tabular">{formatMoney(subtotal, currency)}</dd>
      </div>
      {hasDiscount && (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Discount</dt>
          <dd className="tabular">−{formatMoney(discount, currency)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">{taxLabel}</dt>
        <dd className="tabular">{formatMoney(taxAmount, currency)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t pt-3">
        <dt className="font-semibold">Total</dt>
        <dd className="text-xl font-semibold tracking-tight tabular">{formatMoney(total, currency)}</dd>
      </div>
    </dl>
  )
}
