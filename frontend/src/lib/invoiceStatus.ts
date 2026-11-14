import { CheckCircle2, CircleDashed, Clock, Send, type LucideIcon } from 'lucide-react'

import type { InvoiceStatus } from '@/types'

export interface StatusStyle {
  label: string
  icon: LucideIcon
  className: string
}

/** Label, icon and Tailwind classes per invoice status (StatusBadge, tabs, charts). */
export const STATUS_STYLES: Record<InvoiceStatus, StatusStyle> = {
  draft: {
    label: 'Draft',
    icon: CircleDashed,
    className: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  sent: {
    label: 'Sent',
    icon: Send,
    className:
      'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle2,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  },
  overdue: {
    label: 'Overdue',
    icon: Clock,
    className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
  },
}
