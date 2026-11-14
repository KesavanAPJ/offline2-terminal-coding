import { AlertTriangle, CheckCircle2, Hourglass } from 'lucide-react'

import { KpiCard } from '@/components/common/KpiCard'
import { formatMoneyList } from '@/lib/format'
import type { DashboardSummary } from '@/types'

export interface DashboardKpisProps {
  summary: DashboardSummary | undefined
  loading: boolean
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** Paid / Outstanding / Overdue KPI tiles (multi-currency totals). */
export function DashboardKpis({ summary, loading }: DashboardKpisProps) {
  const counts = summary?.counts
  const outstandingCount = counts ? counts.sent + counts.overdue : 0
  const overdueCount = counts?.overdue ?? 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        label="Paid"
        icon={CheckCircle2}
        tone="success"
        loading={loading}
        value={summary ? formatMoneyList(summary.paid_totals) : '—'}
        hint={counts ? `${plural(counts.paid, 'invoice')} paid` : undefined}
      />
      <KpiCard
        label="Outstanding"
        icon={Hourglass}
        tone="warning"
        loading={loading}
        value={summary ? formatMoneyList(summary.outstanding_totals) : '—'}
        hint={counts ? `${plural(outstandingCount, 'invoice')} awaiting payment` : undefined}
      />
      <KpiCard
        label="Overdue"
        icon={AlertTriangle}
        tone={overdueCount > 0 ? 'danger' : 'default'}
        loading={loading}
        value={summary ? formatMoneyList(summary.overdue_totals) : '—'}
        hint={
          counts ? (overdueCount > 0 ? `${plural(overdueCount, 'invoice')} past due` : 'Nothing overdue') : undefined
        }
      />
    </div>
  )
}
