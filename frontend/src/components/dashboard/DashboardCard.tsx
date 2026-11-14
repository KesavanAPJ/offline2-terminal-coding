import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, RotateCcw } from 'lucide-react'

import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/services/api'
import { cn } from '@/lib/utils'

export interface DashboardCardProps {
  title: string
  description?: ReactNode
  /** Optional "View all" style link in the header. */
  link?: { to: string; label: string }
  /** Extra header controls (e.g. a currency switcher). */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** Titled panel used by every dashboard section. */
export function DashboardCard({ title, description, link, actions, children, className }: DashboardCardProps) {
  return (
    <GlassCard static className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {link && (
            <Link
              to={link.to}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {link.label}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
      {children}
    </GlassCard>
  )
}

/** Stack of row-shaped skeletons. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  )
}

/** Inline error with a retry button. */
export function CardError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <p className="text-destructive">{getErrorMessage(error, 'Could not load this section.')}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw aria-hidden="true" />
        Retry
      </Button>
    </div>
  )
}
