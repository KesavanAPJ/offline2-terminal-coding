import { PartyPopper } from 'lucide-react'

import { CardError, DashboardCard, ListSkeleton } from '@/components/dashboard/DashboardCard'
import { InvoiceRowLink } from '@/components/dashboard/InvoiceRowLink'
import { daysSince } from '@/components/dashboard/relativeTime'
import { AnimatedList } from '@/components/ui/AnimatedList'
import type { InvoiceListItem } from '@/types'

export interface OverdueListProps {
  invoices: InvoiceListItem[] | undefined
  total: number
  loading: boolean
  error: unknown
  onRetry: () => void
}

function overdueLabel(invoice: InvoiceListItem): string {
  const days = daysSince(invoice.due_date)
  if (days === 0) return 'Due today'
  return `${days} day${days === 1 ? '' : 's'} overdue`
}

/** Overdue invoices needing follow-up. */
export function OverdueList({ invoices, total, loading, error, onRetry }: OverdueListProps) {
  return (
    <DashboardCard
      title="Overdue"
      description={total > 0 ? `${total} invoice${total === 1 ? '' : 's'} need a follow-up` : undefined}
      link={total > 0 ? { to: '/invoices?status=overdue', label: 'View all' } : undefined}
    >
      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <CardError error={error} onRetry={onRetry} />
      ) : !invoices || invoices.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <PartyPopper className="size-4 shrink-0" aria-hidden="true" />
          No overdue invoices. Nice work!
        </div>
      ) : (
        <AnimatedList className="-mx-2 divide-y divide-border/60" stagger={0.04}>
          {invoices.map((invoice) => (
            <InvoiceRowLink
              key={invoice.id}
              invoice={invoice}
              showStatus={false}
              meta={<span className="text-red-600 dark:text-red-400">{overdueLabel(invoice)}</span>}
            />
          ))}
        </AnimatedList>
      )}
    </DashboardCard>
  )
}
