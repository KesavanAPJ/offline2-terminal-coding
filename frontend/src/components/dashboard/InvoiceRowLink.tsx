import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/common/StatusBadge'
import { formatMoney } from '@/lib/format'
import type { InvoiceListItem } from '@/types'

export interface InvoiceRowLinkProps {
  invoice: InvoiceListItem
  /** Secondary line under the client name (e.g. a relative date). */
  meta: ReactNode
  showStatus?: boolean
}

/** Compact clickable invoice row: number + client, status, total. */
export function InvoiceRowLink({ invoice, meta, showStatus = true }: InvoiceRowLinkProps) {
  return (
    <Link
      to={`/invoices/${invoice.id}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {invoice.invoice_number}
          <span className="font-normal text-muted-foreground"> · {invoice.client.name}</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      {showStatus && <StatusBadge status={invoice.status} className="hidden sm:inline-flex" />}
      <span className="shrink-0 text-sm font-semibold tabular">{formatMoney(invoice.total, invoice.currency)}</span>
    </Link>
  )
}
