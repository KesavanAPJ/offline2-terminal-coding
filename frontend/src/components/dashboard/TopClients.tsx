import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'

import { CardError, DashboardCard, ListSkeleton } from '@/components/dashboard/DashboardCard'
import { AnimatedList } from '@/components/ui/AnimatedList'
import { formatMoney, initials } from '@/lib/format'
import type { TopClient } from '@/types'

export interface TopClientsProps {
  clients: TopClient[] | undefined
  loading: boolean
  error: unknown
  onRetry: () => void
}

/** Clients ranked by paid revenue. */
export function TopClients({ clients, loading, error, onRetry }: TopClientsProps) {
  return (
    <DashboardCard title="Top clients" description="By paid revenue" link={{ to: '/clients', label: 'All clients' }}>
      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <CardError error={error} onRetry={onRetry} />
      ) : !clients || clients.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          <Users className="size-4 shrink-0" aria-hidden="true" />
          Paid invoices will rank your best clients here.
        </div>
      ) : (
        <AnimatedList className="-mx-2" stagger={0.04}>
          {clients.map((client, index) => (
            <Link
              key={`${client.client_id}-${client.currency}`}
              to={`/clients/${client.client_id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
            >
              <span className="w-4 text-xs text-muted-foreground tabular">{index + 1}</span>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {initials(client.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{client.name}</p>
                <p className="text-xs text-muted-foreground">
                  {client.invoice_count} paid invoice
                  {client.invoice_count === 1 ? '' : 's'}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular">
                {formatMoney(client.amount, client.currency)}
              </span>
            </Link>
          ))}
        </AnimatedList>
      )}
    </DashboardCard>
  )
}
