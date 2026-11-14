import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { ClientForm } from '@/components/clients/ClientForm'
import { PageHeader } from '@/components/common/PageHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { useCreateClient } from '@/hooks/useClients'
import { getErrorMessage } from '@/services/api'
import type { ClientCreate } from '@/types'

export default function ClientCreatePage() {
  const navigate = useNavigate()
  const createClient = useCreateClient()

  const handleSubmit = async (values: ClientCreate): Promise<void> => {
    try {
      const client = await createClient.mutateAsync(values)
      toast.success(`Client "${client.name}" created`)
      navigate(`/clients/${client.id}`, { replace: true })
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Could not create the client.'))
    }
  }

  return (
    <PageWrapper className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={
          <Link to="/clients" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Clients
          </Link>
        }
        title="New client"
        description="Only the name is required. Add the rest now or later."
      />
      <GlassCard static>
        <ClientForm
          onSubmit={handleSubmit}
          submitLabel="Create client"
          isSubmitting={createClient.isPending}
          onCancel={() => navigate('/clients')}
        />
      </GlassCard>
    </PageWrapper>
  )
}
