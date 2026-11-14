import { CheckCircle2, FileText, Hourglass } from 'lucide-react'

import { KpiCard } from '@/components/common/KpiCard'
import { formatMoneyList } from '@/lib/format'
import type { ClientWithStats } from '@/types'

export interface ClientStatsProps {
  client: ClientWithStats | undefined
  loading?: boolean
}

/** Invoice count, paid and outstanding totals (per currency) for one client. */
export function ClientStats({ client, loading = false }: ClientStatsProps) {
  const isLoading = loading || !client
  const fallbackCurrency = client?.paid_totals[0]?.currency ?? client?.outstanding_totals[0]?.currency ?? 'USD'

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCard
        label="Invoices"
        icon={FileText}
        loading={isLoading}
        value={client?.invoice_count ?? 0}
        hint={client && client.invoice_count === 0 ? 'No invoices yet' : undefined}
      />
      <KpiCard
        label="Paid"
        icon={CheckCircle2}
        tone="success"
        loading={isLoading}
        value={client ? formatMoneyList(client.paid_totals, fallbackCurrency) : null}
      />
      <KpiCard
        label="Outstanding"
        icon={Hourglass}
        tone={client && client.outstanding_totals.length > 0 ? 'warning' : 'default'}
        loading={isLoading}
        value={client ? formatMoneyList(client.outstanding_totals, fallbackCurrency) : null}
        hint="Sent + overdue"
      />
    </div>
  )
}

export default ClientStats
