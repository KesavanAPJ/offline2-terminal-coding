import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/common/PageHeader'
import { CardError } from '@/components/dashboard/DashboardCard'
import { DashboardKpis } from '@/components/dashboard/DashboardKpis'
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist'
import { OverdueList } from '@/components/dashboard/OverdueList'
import { RecentInvoices } from '@/components/dashboard/RecentInvoices'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { StatusBreakdown } from '@/components/dashboard/StatusBreakdown'
import { TopClients } from '@/components/dashboard/TopClients'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GradientButton } from '@/components/ui/GradientButton'
import { useAuth } from '@/hooks/useAuth'
import { clientKeys, listClients } from '@/services/clientService'
import {
  dashboardKeys,
  getOverdueInvoices,
  getRecentInvoices,
  getRevenue,
  getSummary,
  getTopClients,
} from '@/services/dashboardService'

const RECENT_LIMIT = 8
const OVERDUE_SIZE = 5
const REVENUE_MONTHS = 12
const TOP_CLIENTS_LIMIT = 5

function greeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function firstName(fullName: string | null | undefined, email: string | undefined): string | null {
  const name = fullName?.trim().split(/\s+/)[0]
  if (name) return name
  return email ? email.split('@')[0] : null
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const name = firstName(user?.full_name, user?.email)

  const summary = useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: getSummary,
  })
  const counts = summary.data?.counts
  const totalInvoices = counts ? counts.draft + counts.sent + counts.paid + counts.overdue : 0
  const isEmpty = summary.isSuccess && totalInvoices === 0
  const hasInvoices = summary.isSuccess && totalInvoices > 0

  const recent = useQuery({
    queryKey: dashboardKeys.recent(RECENT_LIMIT),
    queryFn: () => getRecentInvoices(RECENT_LIMIT),
    enabled: hasInvoices,
  })
  const revenue = useQuery({
    queryKey: dashboardKeys.revenue(REVENUE_MONTHS),
    queryFn: () => getRevenue(REVENUE_MONTHS),
    enabled: hasInvoices,
  })
  const topClients = useQuery({
    queryKey: dashboardKeys.topClients(TOP_CLIENTS_LIMIT),
    queryFn: () => getTopClients(TOP_CLIENTS_LIMIT),
    enabled: hasInvoices,
  })
  const overdue = useQuery({
    queryKey: dashboardKeys.overdue(OVERDUE_SIZE),
    queryFn: () => getOverdueInvoices(OVERDUE_SIZE),
    enabled: hasInvoices && (counts?.overdue ?? 0) > 0,
  })
  const clients = useQuery({
    queryKey: clientKeys.list({ page: 1, size: 1 }),
    queryFn: () => listClients({ page: 1, size: 1 }),
    enabled: isEmpty,
  })

  // Sections only load once the summary says there is something to show.
  const sectionsLoading = summary.isPending
  const overdueCount = counts?.overdue ?? 0

  return (
    <PageWrapper>
      <PageHeader
        title="Dashboard"
        description={
          name
            ? `${greeting()}, ${name}. Here's how your invoices are doing.`
            : 'Paid, outstanding and overdue at a glance.'
        }
        actions={
          <GradientButton onClick={() => navigate('/invoices/new')}>
            <Plus aria-hidden="true" />
            New invoice
          </GradientButton>
        }
      />

      {summary.isError ? (
        <CardError error={summary.error} onRetry={() => void summary.refetch()} />
      ) : isEmpty ? (
        <OnboardingChecklist hasClients={(clients.data?.total ?? 0) > 0} />
      ) : (
        <>
          <DashboardKpis summary={summary.data} loading={summary.isPending} />

          <div className="grid gap-6 lg:grid-cols-3">
            <RevenueChart
              className="lg:col-span-2"
              points={revenue.data}
              loading={sectionsLoading || revenue.isLoading}
              error={revenue.error}
              onRetry={() => void revenue.refetch()}
            />
            <StatusBreakdown counts={counts} loading={summary.isPending} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentInvoices
                invoices={recent.data}
                loading={sectionsLoading || recent.isLoading}
                error={recent.error}
                onRetry={() => void recent.refetch()}
              />
            </div>
            <div className="flex flex-col gap-6">
              <OverdueList
                invoices={overdueCount > 0 ? overdue.data?.items : []}
                total={overdue.data?.total ?? overdueCount}
                loading={sectionsLoading || overdue.isLoading}
                error={overdue.error}
                onRetry={() => void overdue.refetch()}
              />
              <TopClients
                clients={topClients.data}
                loading={sectionsLoading || topClients.isLoading}
                error={topClients.error}
                onRetry={() => void topClients.refetch()}
              />
            </div>
          </div>
        </>
      )}
    </PageWrapper>
  )
}
