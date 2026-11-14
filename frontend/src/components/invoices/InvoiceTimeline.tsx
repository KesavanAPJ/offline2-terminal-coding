import { CheckCircle2, Clock, FilePlus2, Send, type LucideIcon } from 'lucide-react'

import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Invoice } from '@/types'

export interface InvoiceTimelineProps {
  invoice: Pick<Invoice, 'status' | 'created_at' | 'sent_at' | 'paid_at' | 'due_date'>
  className?: string
}

interface TimelineEvent {
  key: string
  label: string
  detail: string
  icon: LucideIcon
  done: boolean
  tone: string
}

/** Created → sent → paid (or overdue) progression for an invoice. */
export function InvoiceTimeline({ invoice, className }: InvoiceTimelineProps) {
  const events: TimelineEvent[] = [
    {
      key: 'created',
      label: 'Created',
      detail: formatDateTime(invoice.created_at),
      icon: FilePlus2,
      done: true,
      tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      key: 'sent',
      label: 'Sent',
      detail: invoice.sent_at ? formatDateTime(invoice.sent_at) : 'Not sent yet',
      icon: Send,
      done: Boolean(invoice.sent_at),
      tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    },
  ]
  if (invoice.status === 'overdue') {
    events.push({
      key: 'overdue',
      label: 'Overdue',
      detail: `Was due ${formatDate(invoice.due_date)}`,
      icon: Clock,
      done: true,
      tone: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    })
  }
  events.push({
    key: 'paid',
    label: 'Paid',
    detail: invoice.paid_at ? formatDateTime(invoice.paid_at) : `Due ${formatDate(invoice.due_date)}`,
    icon: CheckCircle2,
    done: Boolean(invoice.paid_at),
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  })

  return (
    <ol className={cn('space-y-4', className)} aria-label="Invoice timeline">
      {events.map((event, index) => {
        const Icon = event.icon
        return (
          <li key={event.key} className="relative flex gap-3">
            {index < events.length - 1 && (
              <span aria-hidden="true" className="absolute top-8 left-4 h-[calc(100%-1rem)] w-px bg-border" />
            )}
            <span
              className={cn(
                'relative flex size-8 shrink-0 items-center justify-center rounded-full',
                event.done ? event.tone : 'border border-dashed bg-background text-muted-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 pt-1">
              <p className={cn('text-sm font-medium', !event.done && 'text-muted-foreground')}>{event.label}</p>
              <p className="text-xs text-muted-foreground">{event.detail}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
