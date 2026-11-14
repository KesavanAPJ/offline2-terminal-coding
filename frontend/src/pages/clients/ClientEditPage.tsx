import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { ClientForm } from '@/components/clients/ClientForm'
import { ClientNotFound } from '@/components/clients/ClientNotFound'
import { PageHeader } from '@/components/common/PageHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { getErrorMessage, getErrorStatus } from '@/services/api'
import type { ClientCreate } from '@/types'

function parseId(value: string | undefined): number | undefined {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

export default function ClientEditPage() {
  const navigate = useNavigate()
  const id = parseId(useParams<{ id: string }>().id)
  const { data: client, isPending, isError, error, refetch } = useClient(id)
  const updateClient = useUpdateClient(id ?? 0)

  const handleSubmit = async (values: ClientCreate): Promise<void> => {
    if (!id) return
    try {
      const updated = await updateClient.mutateAsync(values)
      toast.success(`Client "${updated.name}" updated`)
      navigate(`/clients/${updated.id}`, { replace: true })
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Could not save the client.'))
    }
  }

  const backLink = (
    <Link to={id ? `/clients/${id}` : '/clients'} className="inline-flex items-center gap-1 hover:text-foreground">
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      {client?.name ?? 'Back'}
    </Link>
  )

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

  return (
    <PageWrapper className="mx-auto max-w-3xl">
      <PageHeader eyebrow={backLink} title="Edit client" description="Update contact and billing details." />
      <GlassCard static>
        {isPending || !client ? (
          <div className="space-y-5" aria-busy="true">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <ClientForm
            key={client.id}
            defaultValues={client}
            onSubmit={handleSubmit}
            submitLabel="Save changes"
            isSubmitting={updateClient.isPending}
            onCancel={() => navigate(`/clients/${client.id}`)}
          />
        )}
      </GlassCard>
    </PageWrapper>
  )
}
