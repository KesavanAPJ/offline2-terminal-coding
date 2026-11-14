import { FileText, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { InvoicesTable, InvoicesTableSkeleton } from '@/components/invoices/InvoicesTable'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { GradientButton } from '@/components/ui/GradientButton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useInvoicesList } from '@/hooks/useInvoices'
import { getErrorMessage } from '@/services/api'
import { INVOICE_STATUSES, type InvoiceListParams, type InvoiceStatus } from '@/types'

const PAGE_SIZE = 20

type StatusTab = InvoiceStatus | 'all'

const TABS: { value: StatusTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
]

function parseStatus(value: string | null): InvoiceStatus | undefined {
  return INVOICE_STATUSES.find((status) => status === value)
}

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

const EMPTY_COPY: Record<StatusTab, string> = {
  all: 'Create your first invoice — it takes under a minute.',
  draft: 'No drafts. Everything is sent!',
  sent: 'No invoices waiting on payment.',
  overdue: 'Nothing overdue. Nice.',
  paid: 'No paid invoices yet.',
}

export default function InvoicesListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseStatus(searchParams.get('status'))
  const page = parsePage(searchParams.get('page'))
  const clientIdParam = Number(searchParams.get('client_id'))
  const clientId = Number.isInteger(clientIdParam) && clientIdParam > 0 ? clientIdParam : undefined

  const params: InvoiceListParams = { status, client_id: clientId, page, size: PAGE_SIZE }
  const { data, isPending, isError, error, isFetching, refetch } = useInvoicesList(params)
  const tab: StatusTab = status ?? 'all'

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next)
  }

  const newInvoiceHref = clientId ? `/invoices/new?client_id=${clientId}` : '/invoices/new'

  return (
    <PageWrapper>
      <PageHeader
        title="Invoices"
        description="Track drafts, sent, paid and overdue invoices."
        actions={
          <GradientButton onClick={() => navigate(newInvoiceHref)}>
            <Plus aria-hidden="true" />
            New invoice
          </GradientButton>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(value) => updateParams({ status: value === 'all' ? null : value, page: null })}>
          <TabsList className="max-w-full overflow-x-auto">
            {TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="px-3">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {clientId && (
          <Button variant="ghost" size="sm" onClick={() => updateParams({ client_id: null, page: null })}>
            Clear client filter
          </Button>
        )}
      </div>

      {isPending ? (
        <InvoicesTableSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load invoices</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {getErrorMessage(error)}
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={tab === 'all' ? 'No invoices yet' : `No ${tab} invoices`}
          description={EMPTY_COPY[tab]}
          action={
            <GradientButton onClick={() => navigate(newInvoiceHref)}>
              <Plus aria-hidden="true" />
              New invoice
            </GradientButton>
          }
        />
      ) : (
        <div className="space-y-4">
          <InvoicesTable invoices={data.items} />
          <Pagination
            page={data.page}
            size={data.size}
            total={data.total}
            disabled={isFetching}
            onPageChange={(next) => updateParams({ page: next > 1 ? String(next) : null })}
          />
        </div>
      )}
    </PageWrapper>
  )
}
