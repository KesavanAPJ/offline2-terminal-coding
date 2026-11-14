import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FilePlus2, FileText, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ClientInfoCard } from '@/components/clients/ClientInfoCard'
import { ClientInvoicesTable } from '@/components/clients/ClientInvoicesTable'
import { ClientNotFound } from '@/components/clients/ClientNotFound'
import { ClientStats } from '@/components/clients/ClientStats'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientButton } from '@/components/ui/GradientButton'
import { useClient, useClientInvoices, useDeleteClient } from '@/hooks/useClients'
import { cn } from '@/lib/utils'
import { getErrorMessage, getErrorStatus } from '@/services/api'

const INVOICES_PAGE_SIZE = 10

/** Skeleton that is valid inside headings / paragraphs (span, not div). */
function InlineSkeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block animate-pulse rounded-md bg-accent', className)} />
}

function parseId(value: string | undefined): number | undefined {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

export default function ClientDetailPage() {
  const navigate = useNavigate()
  const id = parseId(useParams<{ id: string }>().id)
  const [invoicePage, setInvoicePage] = useState(1)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: client, isPending, isError, error, refetch } = useClient(id)
  const invoicesQuery = useClientInvoices(client ? id : undefined, { page: invoicePage, size: INVOICES_PAGE_SIZE })
  const deleteClient = useDeleteClient()

  const newInvoice = () => navigate(`/invoices/new?client_id=${id ?? ''}`)

  const handleDelete = async (): Promise<void> => {
    if (!id || !client) return
    try {
      await deleteClient.mutateAsync(id)
      toast.success(`Client "${client.name}" deleted`)
      setConfirmOpen(false)
      navigate('/clients', { replace: true })
    } catch (err: unknown) {
      // 409: client has sent/paid invoices; the API detail explains why. Keep the client.
      setConfirmOpen(false)
      toast.error(getErrorMessage(err, 'Could not delete the client.'))
    }
  }

  if (!id || (isError && getErrorStatus(error) === 404)) {
    return (
      <PageWrapper>
        <ClientNotFound />
      </PageWrapper>
    )
  }

  if (isError) {
    return (
      <PageWrapper>
        <ClientNotFound errorMessage={getErrorMessage(error)} onRetry={() => void refetch()} />
      </PageWrapper>
    )
  }

  const loading = isPending || !client
  const invoices = invoicesQuery.data?.items ?? []
  const invoiceTotal = invoicesQuery.data?.total ?? 0

  let invoicesContent
  if (invoicesQuery.isError && !invoicesQuery.data) {
    invoicesContent = (
      <div className="p-6">
        <EmptyState
          title="Couldn't load invoices"
          description={getErrorMessage(invoicesQuery.error)}
          action={
            <Button variant="outline" onClick={() => void invoicesQuery.refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    )
  } else if (loading || invoicesQuery.isPending) {
    invoicesContent = <ClientInvoicesTable invoices={[]} loading />
  } else if (invoices.length === 0) {
    invoicesContent = (
      <div className="p-6">
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description={`Create the first invoice for ${client.name}.`}
          action={
            <GradientButton onClick={newInvoice}>
              <FilePlus2 aria-hidden="true" />
              New invoice
            </GradientButton>
          }
        />
      </div>
    )
  } else {
    invoicesContent = (
      <>
        <ClientInvoicesTable invoices={invoices} stale={invoicesQuery.isPlaceholderData} />
        {invoiceTotal > INVOICES_PAGE_SIZE && (
          <div className="border-t px-6 py-4">
            <Pagination
              page={invoicePage}
              size={INVOICES_PAGE_SIZE}
              total={invoiceTotal}
              onPageChange={setInvoicePage}
              disabled={invoicesQuery.isPlaceholderData}
            />
          </div>
        )}
      </>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        eyebrow={
          <Link to="/clients" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Clients
          </Link>
        }
        title={loading ? <InlineSkeleton className="h-8 w-56 align-middle" /> : client.name}
        description={loading ? <InlineSkeleton className="h-4 w-32" /> : (client.company ?? undefined)}
        actions={
          <>
            <Button variant="outline" disabled={loading} onClick={() => navigate(`/clients/${id}/edit`)}>
              <Pencil aria-hidden="true" />
              Edit
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => setConfirmOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
            <GradientButton disabled={loading} onClick={newInvoice}>
              <FilePlus2 aria-hidden="true" />
              New invoice
            </GradientButton>
          </>
        }
      />

      <ClientStats client={client} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ClientInfoCard client={client} loading={loading} />
        </div>
        <GlassCard static flush className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between gap-2 px-6 pt-5 pb-3">
            <h2 className="text-base font-semibold">Invoices</h2>
            {invoiceTotal > 0 && (
              <span className="text-sm text-muted-foreground tabular">
                {invoiceTotal} {invoiceTotal === 1 ? 'invoice' : 'invoices'}
              </span>
            )}
          </div>
          {invoicesContent}
        </GlassCard>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${client?.name ?? 'client'}?`}
        description="This permanently removes the client and any draft invoices. Clients with sent or paid invoices can't be deleted."
        confirmLabel="Delete client"
        destructive
        loading={deleteClient.isPending}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  )
}
