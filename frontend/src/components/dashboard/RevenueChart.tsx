import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3 } from 'lucide-react'

import { CardError, DashboardCard } from '@/components/dashboard/DashboardCard'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney, toDecimal } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RevenuePoint } from '@/types'

export interface RevenueChartProps {
  points: RevenuePoint[] | undefined
  loading: boolean
  error: unknown
  onRetry: () => void
  className?: string
}

interface ChartDatum {
  month: string
  amount: number
  raw: string
}

interface TooltipEntry {
  payload?: ChartDatum
}

interface RevenueTooltipProps {
  active?: boolean
  payload?: readonly TooltipEntry[]
  currency: string
}

/** "2026-03" -> Date (local, first of month). */
function monthDate(month: string): Date {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, (mon ?? 1) - 1, 1)
}

const shortMonth = new Intl.DateTimeFormat(undefined, { month: 'short' })
const longMonth = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
})

function compactMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return String(value)
  }
}

function RevenueTooltip({ active, payload, currency }: RevenueTooltipProps) {
  const datum = payload?.[0]?.payload
  if (!active || !datum) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="text-xs text-muted-foreground">{longMonth.format(monthDate(datum.month))}</p>
      <p className="font-semibold tabular">{formatMoney(datum.raw, currency)}</p>
    </div>
  )
}

/** Monthly paid revenue for one currency at a time (defaults to the largest). */
export function RevenueChart({ points, loading, error, onRetry, className }: RevenueChartProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const currencies = useMemo(() => {
    const totals = new Map<string, ReturnType<typeof toDecimal>>()
    for (const point of points ?? []) {
      totals.set(point.currency, (totals.get(point.currency) ?? toDecimal(0)).plus(toDecimal(point.amount)))
    }
    return [...totals.entries()].sort((a, b) => b[1].comparedTo(a[1])).map(([currency]) => currency)
  }, [points])

  const currency = selected && currencies.includes(selected) ? selected : (currencies[0] ?? null)

  const data = useMemo<ChartDatum[]>(
    () =>
      (points ?? [])
        .filter((point) => point.currency === currency)
        .map((point) => ({
          month: point.month,
          amount: toDecimal(point.amount).toNumber(),
          raw: point.amount,
        })),
    [points, currency],
  )

  const switcher =
    currencies.length > 1 ? (
      <div className="flex rounded-lg border border-border/60 p-0.5" role="group" aria-label="Currency">
        {currencies.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setSelected(code)}
            aria-pressed={code === currency}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              code === currency ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {code}
          </button>
        ))}
      </div>
    ) : undefined

  const total = data.reduce((sum, datum) => sum.plus(toDecimal(datum.raw)), toDecimal(0))

  return (
    <DashboardCard
      title="Revenue"
      description={
        currency ? `${formatMoney(total.toFixed(2), currency)} paid in the last 12 months` : 'Paid, last 12 months'
      }
      actions={switcher}
      className={className}
    >
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <CardError error={error} onRetry={onRetry} />
      ) : !currency ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground">
          <BarChart3 className="size-6" aria-hidden="true" />
          Revenue appears here once invoices are paid.
        </div>
      ) : (
        <div className="h-64 w-full" role="img" aria-label={`Monthly paid revenue in ${currency}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={(month: string) => shortMonth.format(monthDate(month))}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                width={56}
                tickFormatter={(value: number) => compactMoney(value, currency)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-accent)', opacity: 0.5 }}
                content={({ active, payload }) => (
                  <RevenueTooltip
                    active={active}
                    payload={payload as readonly TooltipEntry[] | undefined}
                    currency={currency}
                  />
                )}
              />
              <Bar dataKey="amount" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardCard>
  )
}
