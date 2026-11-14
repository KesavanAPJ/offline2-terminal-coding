import { useNavigate } from 'react-router-dom'

import { StatusBadge } from '@/components/common/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatMoney } from '@/lib/format'
import type { InvoiceListItem } from '@/types'

export interface InvoicesTableProps {
  invoices: InvoiceListItem[]
}

/** Invoice list: table on md+, stacked cards on mobile. Rows open the invoice. */
export function InvoicesTable({ invoices }: InvoicesTableProps) {
  const navigate = useNavigate()
  const open = (id: number) => navigate(`/invoices/${id}`)

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border bg-card/80 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Number</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                tabIndex={0}
                className="cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none"
                onClick={() => open(invoice.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    open(invoice.id)
                  }
                }}
                aria-label={`Open invoice ${invoice.invoice_number}`}
              >
                <TableCell className="pl-4 font-mono text-sm font-medium">{invoice.invoice_number}</TableCell>
                <TableCell className="max-w-56">
                  <div className="truncate font-medium">{invoice.client.name}</div>
                  {invoice.client.company && (
                    <div className="truncate text-xs text-muted-foreground">{invoice.client.company}</div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(invoice.issue_date)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(invoice.due_date)}</TableCell>
                <TableCell>
                  <StatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className="pr-4 text-right font-medium tabular">
                  {formatMoney(invoice.total, invoice.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <button
              type="button"
              onClick={() => open(invoice.id)}
              className="flex w-full flex-col gap-2 rounded-xl border bg-card/80 p-4 text-left shadow-sm transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-medium">{invoice.invoice_number}</span>
                <StatusBadge status={invoice.status} />
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{invoice.client.name}</p>
                  <p className="text-xs text-muted-foreground">Due {formatDate(invoice.due_date)}</p>
                </div>
                <span className="font-semibold tabular">{formatMoney(invoice.total, invoice.currency)}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Loading placeholder matching the table layout. */
export function InvoicesTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-card/80 p-4" aria-busy="true" aria-label="Loading invoices">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="hidden h-5 w-24 md:block" />
          <Skeleton className="hidden h-5 w-24 md:block" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  )
}
