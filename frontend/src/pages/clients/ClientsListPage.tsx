import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Plus, SearchX, Users } from 'lucide-react'

import { ClientSearchInput } from '@/components/clients/ClientSearchInput'
import { ClientsTable } from '@/components/clients/ClientsTable'
import { useDebouncedValue } from '@/components/clients/useDebouncedValue'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { GradientButton } from '@/components/ui/GradientButton'
import { useClientsList } from '@/hooks/useClients'
import { getErrorMessage } from '@/services/api'

const PAGE_SIZE = 20

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

export default function ClientsListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const page = parsePage(searchParams.get('page'))

  const [search, setSearch] = useState(urlQuery)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  // Push the debounced search into the URL (resetting to page 1).
  useEffect(() => {
    if (debouncedSearch === urlQuery) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (debouncedSearch) next.set('q', debouncedSearch)
        else next.delete('q')
        next.delete('page')
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced input
  }, [debouncedSearch])

  // Keep the input in sync when the URL changes externally (back/forward navigation).
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery)
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery)
    // Changes we pushed ourselves match the debounced value; only external ones overwrite the input.
    if (urlQuery !== debouncedSearch) setSearch(urlQuery)
  }

  const { data, isPending, isError, error, isPlaceholderData, isFetching, refetch } = useClientsList({
    q: urlQuery || undefined,
    page,
    size: PAGE_SIZE,
  })

  const setPage = (nextPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (nextPage <= 1) next.delete('page')
      else next.set('page', String(nextPage))
      return next
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clients = data?.items ?? []
  const total = data?.total ?? 0
  const isSearching = urlQuery !== ''
  const searchPending = search.trim() !== urlQuery || (isFetching && isPlaceholderData)

  // Requested page past the end (e.g. after deletes) -> go back to the last page.
  useEffect(() => {
    if (data && data.items.length === 0 && data.total > 0 && page > 1) {
      setPage(Math.max(1, Math.ceil(data.total / PAGE_SIZE)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page])

  const newClientButton = (
    <GradientButton onClick={() => navigate('/clients/new')}>
      <Plus aria-hidden="true" />
      New client
    </GradientButton>
  )

  let content
  if (isError && !data) {
    content = (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load clients"
        description={getErrorMessage(error)}
        action={
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        }
      />
    )
  } else if (isPending) {
    content = <ClientsTable clients={[]} loading />
  } else if (clients.length === 0 && isSearching) {
    content = (
      <EmptyState
        icon={SearchX}
        title="No matching clients"
        description={`Nothing matches "${urlQuery}". Try another name, email or company.`}
        action={
          <Button variant="outline" onClick={() => setSearch('')}>
            Clear search
          </Button>
        }
      />
    )
  } else if (clients.length === 0 && total === 0) {
    content = (
      <EmptyState
        icon={Users}
        title="No clients yet"
        description="Add the people and companies you bill. It only takes a few seconds."
        action={newClientButton}
      />
    )
  } else {
    content = (
      <div className="flex flex-col gap-4">
        <ClientsTable clients={clients} stale={isPlaceholderData} />
        {total > PAGE_SIZE && (
          <Pagination page={page} size={PAGE_SIZE} total={total} onPageChange={setPage} disabled={isPlaceholderData} />
        )}
      </div>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Clients"
        description={
          data && total > 0
            ? `${total} ${total === 1 ? 'client' : 'clients'}${isSearching ? ' found' : ''}`
            : 'Manage the people and companies you bill.'
        }
        actions={newClientButton}
      />
      <ClientSearchInput value={search} onChange={setSearch} loading={searchPending && !isPending} />
      {content}
    </PageWrapper>
  )
}
