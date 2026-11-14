import { Link } from 'react-router-dom'
import { Building2, CheckCircle2, ChevronRight, FilePlus2, Rocket, UserPlus, type LucideIcon } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { AnimatedList } from '@/components/ui/AnimatedList'
import { cn } from '@/lib/utils'

interface Step {
  title: string
  description: string
  to: string
  icon: LucideIcon
  done: boolean
}

export interface OnboardingChecklistProps {
  /** Whether the user already has at least one client. */
  hasClients: boolean
}

/** Shown instead of the dashboard while the user has no invoices. */
export function OnboardingChecklist({ hasClients }: OnboardingChecklistProps) {
  const steps: Step[] = [
    {
      title: 'Set up your business profile',
      description: 'Add your logo, address and default currency.',
      to: '/settings',
      icon: Building2,
      done: false,
    },
    {
      title: 'Add a client',
      description: 'Save who you bill so invoices fill in automatically.',
      to: '/clients/new',
      icon: UserPlus,
      done: hasClients,
    },
    {
      title: 'Create your first invoice',
      description: 'Build it, send it, and get paid.',
      to: '/invoices/new',
      icon: FilePlus2,
      done: false,
    },
  ]

  return (
    <EmptyState
      icon={Rocket}
      title="Welcome to InvoiceFlow"
      description="Three quick steps and you're ready to send your first invoice."
      action={
        <AnimatedList className="flex w-full max-w-md flex-col gap-2 text-left" stagger={0.08}>
          {steps.map((step, index) => {
            const Icon = step.done ? CheckCircle2 : step.icon
            return (
              <Link
                key={step.to}
                to={step.to}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition-colors hover:bg-accent/50"
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    step.done
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-accent text-accent-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-medium', step.done && 'text-muted-foreground line-through')}>
                    {index + 1}. {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            )
          })}
        </AnimatedList>
      }
    />
  )
}
