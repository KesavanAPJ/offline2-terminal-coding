import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type KpiTone = 'default' | 'success' | 'warning' | 'danger'

const toneClasses: Record<KpiTone, string> = {
  default: 'bg-accent text-accent-foreground',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

export interface KpiCardProps {
  label: string
  value: ReactNode
  icon?: LucideIcon
  /** Secondary line, e.g. "3 invoices". */
  hint?: ReactNode
  tone?: KpiTone
  loading?: boolean
  className?: string
}

/** Metric tile for dashboards. */
export function KpiCard({ label, value, icon: Icon, hint, tone = 'default', loading = false, className }: KpiCardProps) {
  return (
    <GlassCard className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn('flex size-9 items-center justify-center rounded-lg', toneClasses[tone])}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <div className="text-2xl font-semibold tracking-tight tabular">{value}</div>
      )}
      {hint && !loading && <p className="text-xs text-muted-foreground">{hint}</p>}
    </GlassCard>
  )
}
