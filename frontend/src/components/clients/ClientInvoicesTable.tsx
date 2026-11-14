import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { StatusBadge } from '@/components/common/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InvoiceListItem } from '@/types'

export interface ClientInvoicesTableProps {
  invoices: InvoiceListItem[]
  loading?: boolean
  stale?: boolean
  skeletonRows?: number
}

/** A client's invoices: table on desktop, cards on mobile. Rows open the invoice. */
export function ClientInvoicesTable({ invoices, loading = false, stale = false, skeletonRows = 4 }: ClientInvoicesTableProps) {
  const navigate = useNavigate()
  const open = (id: number) => navigate(`/invoices/${id}`)
  const skeletons = Array.from({ length: skeletonRows }, (_, i) => i)

  return (
    <div className={cn('transition-opacity', stale && 'opacity-60')} aria-busy={loading || stale || undefined}>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Number</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? skeletons.map((i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    <TableCell className="pl-6">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="pr-6">
                      <Skeleton className="ml-auto h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              : invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open invoice ${invoice.invoice_number}`}
                    onClick={() => open(invoice.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        open(invoice.id)
                      }
                    }}
                    className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <TableCell className="pl-6 font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell className="text-muted-foreground tabular">{formatDate(invoice.issue_date)}</TableCell>
                    <TableCell className="text-muted-foreground tabular">{formatDate(invoice.due_date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="pr-6 text-right font-medium tabular">
                      {formatMoney(invoice.total, invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col divide-y md:hidden">
        {loading
          ? skeletons.map((i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-16" />
              </li>
            ))
          : invoices.map((invoice) => (
              <li key={invoice.id}>
                <button
                  type="button"
                  onClick={() => open(invoice.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{invoice.invoice_number}</span>
                      <StatusBadge status={invoice.status} hideIcon />
                    </div>
                    <p className="text-xs text-muted-foreground tabular">Due {formatDate(invoice.due_date)}</p>
                  </div>
                  <span className="font-medium tabular">{formatMoney(invoice.total, invoice.currency)}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
      </ul>
    </div>
  )
}

export default ClientInvoicesTable
