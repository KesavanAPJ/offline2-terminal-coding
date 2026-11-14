import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface BrandProps {
  className?: string
  /** Link target; pass null to render without a link. */
  to?: string | null
}

/** InvoiceFlow logo mark + wordmark. */
export function Brand({ className, to = '/dashboard' }: BrandProps) {
  const content = (
    <>
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-gradient-from to-gradient-to text-white shadow-sm">
        <Receipt className="size-4" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        Invoice<span className="text-primary">Flow</span>
      </span>
    </>
  )
  const classes = cn('flex items-center gap-2', className)
  return to ? (
    <Link to={to} className={classes} aria-label="InvoiceFlow home">
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  )
}
