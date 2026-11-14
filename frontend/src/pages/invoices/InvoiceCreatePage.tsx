import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/common/PageHeader'
import { InvoiceForm, type InvoiceSubmitIntent } from '@/components/invoices/InvoiceForm'
import { InvoiceFormSkeleton } from '@/components/invoices/InvoiceFormSkeleton'
import { buildCreateDefaults, FALLBACK_TERMS_DAYS } from '@/components/invoices/invoiceFormSchema'
import { useSendAndShare } from '@/components/invoices/useSendAndShare'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useCreateInvoice } from '@/hooks/useInvoices'
import { getErrorMessage } from '@/services/api'
import { clientKeys, getClient } from '@/services/clientService'
import { useBusinessProfile } from '@/services/settingsService'
import type { ClientSummary, InvoiceCreate } from '@/types'

export default function InvoiceCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdParam = Number(searchParams.get('client_id'))
  const preselectId = Number.isInteger(clientIdParam) && clientIdParam > 0 ? clientIdParam : null

  const profileQuery = useBusinessProfile()
  const clientQuery = useQuery({
    queryKey: clientKeys.detail(preselectId ?? 0),
    queryFn: () => getClient(preselectId as number),
    enabled: preselectId !== null,
  })

  const createInvoice = useCreateInvoice()
  const { sendAndShare } = useSendAndShare()

  // Profile failures fall back to defaults (USD, 14 days) so invoicing is never blocked.
  const loading = profileQuery.isPending || (preselectId !== null && clientQuery.isPending)

  const preselected: ClientSummary | null = clientQuery.data
    ? {
        id: clientQuery.data.id,
        name: clientQuery.data.name,
        email: clientQuery.data.email,
        company: clientQuery.data.company,
      }
    : null

  const handleSubmit = async (payload: InvoiceCreate, intent: InvoiceSubmitIntent) => {
    let invoiceId: number
    let invoiceNumber: string
    try {
      const invoice = await createInvoice.mutateAsync(payload)
      invoiceId = invoice.id
      invoiceNumber = invoice.invoice_number
    } catch (err: unknown) {
      toast.error('Could not save the invoice', { description: getErrorMessage(err) })
      throw err
    }

    if (intent === 'draft') {
      toast.success(`Draft ${invoiceNumber} saved`)
    } else {
      const sent = await sendAndShare(invoiceId)
      if (!sent) toast.info(`${invoiceNumber} was saved as a draft. You can send it from the invoice page.`)
    }
    navigate(`/invoices/${invoiceId}`, { replace: true })
  }

  return (
    <PageWrapper>
      <PageHeader
        eyebrow={
          <Link to="/invoices" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Invoices
          </Link>
        }
        title="New invoice"
        description="Pick a client, add a line or two, and hit Save & send."
      />
      {loading ? (
        <InvoiceFormSkeleton />
      ) : (
        <InvoiceForm
          mode="create"
          defaultValues={buildCreateDefaults(profileQuery.data, preselected)}
          initialClient={preselected}
          paymentTermsDays={profileQuery.data?.default_payment_terms_days ?? FALLBACK_TERMS_DAYS}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
        />
      )}
    </PageWrapper>
  )
}
