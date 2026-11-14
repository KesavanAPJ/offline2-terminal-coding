import { Badge } from '@/components/ui/badge'
import { STATUS_STYLES } from '@/lib/invoiceStatus'
import { cn } from '@/lib/utils'
import type { InvoiceStatus } from '@/types'

export interface StatusBadgeProps {
  status: InvoiceStatus
  className?: string
  /** Hide the leading icon. */
  hideIcon?: boolean
}

/** Colored badge for an invoice status (draft / sent / paid / overdue). */
export function StatusBadge({ status, className, hideIcon = false }: StatusBadgeProps) {
  const style = STATUS_STYLES[status]
  const Icon = style.icon
  return (
    <Badge variant="outline" className={cn('font-medium', style.className, className)} data-status={status}>
      {!hideIcon && <Icon aria-hidden="true" />}
      {style.label}
    </Badge>
  )
}
