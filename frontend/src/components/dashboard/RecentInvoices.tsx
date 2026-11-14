import { FileText } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { CardError, DashboardCard, ListSkeleton } from '@/components/dashboard/DashboardCard'
import { InvoiceRowLink } from '@/components/dashboard/InvoiceRowLink'
import { formatRelative } from '@/components/dashboard/relativeTime'
import { AnimatedList } from '@/components/ui/AnimatedList'
import type { InvoiceListItem } from '@/types'

export interface RecentInvoicesProps {
  invoices: InvoiceListItem[] | undefined
  loading: boolean
  error: unknown
  onRetry: () => void
}

/** Most recently touched invoice: paid/sent/created timestamp, whichever is latest. */
function activityLabel(invoice: InvoiceListItem): string {
  if (invoice.paid_at) return `Paid ${formatRelative(invoice.paid_at)}`
  if (invoice.sent_at) return `Sent ${formatRelative(invoice.sent_at)}`
  return `Created ${formatRelative(invoice.created_at)}`
}

/** List of the latest invoices linking to their detail pages. */
export function RecentInvoices({ invoices, loading, error, onRetry }: RecentInvoicesProps) {
  return (
    <DashboardCard title="Recent invoices" link={{ to: '/invoices', label: 'View all' }}>
      {loading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <CardError error={error} onRetry={onRetry} />
      ) : !invoices || invoices.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices yet" className="py-8" />
      ) : (
        <AnimatedList className="-mx-2 divide-y divide-border/60" stagger={0.04}>
          {invoices.map((invoice) => (
            <InvoiceRowLink key={invoice.id} invoice={invoice} meta={activityLabel(invoice)} />
          ))}
        </AnimatedList>
      )}
    </DashboardCard>
  )
}
