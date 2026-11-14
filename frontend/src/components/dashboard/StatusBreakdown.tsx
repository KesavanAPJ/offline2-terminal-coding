import { Link } from 'react-router-dom'

import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_STYLES } from '@/lib/invoiceStatus'
import { cn } from '@/lib/utils'
import type { InvoiceStatus } from '@/types'

const ORDER: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue']

/** Solid segment fills matching the StatusBadge hues (SVG `fill-*` classes). */
const SEGMENT_FILL: Record<InvoiceStatus, string> = {
  draft: 'fill-slate-400 dark:fill-slate-500',
  sent: 'fill-indigo-500 dark:fill-indigo-400',
  paid: 'fill-emerald-500 dark:fill-emerald-400',
  overdue: 'fill-red-500 dark:fill-red-400',
}

const DOT_BG: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-400 dark:bg-slate-500',
  sent: 'bg-indigo-500 dark:bg-indigo-400',
  paid: 'bg-emerald-500 dark:bg-emerald-400',
  overdue: 'bg-red-500 dark:bg-red-400',
}

/** Gap between segments, in viewBox units (viewBox width = 100). */
const GAP = 0.8

export interface StatusBreakdownProps {
  counts: Record<InvoiceStatus, number> | undefined
  loading: boolean
}

/** Segmented bar of invoice counts per status, with a linked legend. */
export function StatusBreakdown({ counts, loading }: StatusBreakdownProps) {
  const total = counts ? ORDER.reduce((sum, status) => sum + counts[status], 0) : 0
  const visible = counts ? ORDER.filter((status) => counts[status] > 0) : []
  const usable = 100 - GAP * Math.max(visible.length - 1, 0)

  const widths = visible.map((status) => (counts && total > 0 ? (counts[status] / total) * usable : 0))
  const segments = visible.map((status, index) => ({
    status,
    width: widths[index],
    x: widths.slice(0, index).reduce((sum, width) => sum + width + GAP, 0),
  }))

  return (
    <DashboardCard title="Invoices by status" description={counts ? `${total} total` : undefined}>
      {loading || !counts ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            {ORDER.map((status) => (
              <Skeleton key={status} className="h-12" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <svg
            viewBox="0 0 100 4"
            preserveAspectRatio="none"
            className="h-3 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={ORDER.map((status) => `${STATUS_STYLES[status].label}: ${counts[status]}`).join(', ')}
          >
            {segments.map((segment) => (
              <rect
                key={segment.status}
                x={segment.x}
                y={0}
                width={segment.width}
                height={4}
                className={SEGMENT_FILL[segment.status]}
              >
                <title>{`${STATUS_STYLES[segment.status].label}: ${counts[segment.status]}`}</title>
              </rect>
            ))}
          </svg>
          <ul className="grid grid-cols-2 gap-3">
            {ORDER.map((status) => {
              const Icon = STATUS_STYLES[status].icon
              const share = total > 0 ? Math.round((counts[status] / total) * 100) : 0
              return (
                <li key={status}>
                  <Link
                    to={`/invoices?status=${status}`}
                    className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-accent/50"
                  >
                    <span className={cn('size-2.5 shrink-0 rounded-full', DOT_BG[status])} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Icon className="size-3" aria-hidden="true" />
                        {STATUS_STYLES[status].label}
                      </p>
                      <p className="text-lg font-semibold tabular">
                        {counts[status]}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">{share}%</span>
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </DashboardCard>
  )
}
