import { ArrowLeft, Lock } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InvoiceForm, type InvoiceSubmitIntent } from '@/components/invoices/InvoiceForm'
import { InvoiceFormSkeleton } from '@/components/invoices/InvoiceFormSkeleton'
import { buildEditDefaults, FALLBACK_TERMS_DAYS } from '@/components/invoices/invoiceFormSchema'
import { useSendAndShare } from '@/components/invoices/useSendAndShare'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useInvoice, useUpdateInvoice } from '@/hooks/useInvoices'
import { getErrorMessage, getErrorStatus } from '@/services/api'
import { useBusinessProfile } from '@/services/settingsService'
import type { InvoiceCreate } from '@/types'

export default function InvoiceEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const invoiceId = Number(id)
  const { data: invoice, isPending, isError, error, refetch } = useInvoice(invoiceId)
  const profileQuery = useBusinessProfile()
  const updateInvoice = useUpdateInvoice()
  const { sendAndShare } = useSendAndShare()

  const backLink = (
    <Link
      to={Number.isInteger(invoiceId) && invoiceId > 0 ? `/invoices/${invoiceId}` : '/invoices'}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {invoice ? invoice.invoice_number : 'Back'}
    </Link>
  )

  const handleSubmit = async (payload: InvoiceCreate, intent: InvoiceSubmitIntent) => {
    try {
      await updateInvoice.mutateAsync({ id: invoiceId, payload })
    } catch (err: unknown) {
      const message =
        getErrorStatus(err) === 409 ? 'Only draft invoices can be edited.' : getErrorMessage(err)
      toast.error('Could not save changes', { description: message })
      throw err
    }
    if (intent === 'draft') {
      toast.success('Changes saved')
    } else {
      await sendAndShare(invoiceId)
    }
    navigate(`/invoices/${invoiceId}`, { replace: true })
  }

  if (!Number.isInteger(invoiceId) || invoiceId <= 0 || (isError && getErrorStatus(error) === 404)) {
    return (
      <PageWrapper>
        <EmptyState
          title="Invoice not found"
          description="It may have been deleted, or the link is wrong."
          action={
            <Button asChild variant="outline">
              <Link to="/invoices">Back to invoices</Link>
            </Button>
          }
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        eyebrow={backLink}
        title={invoice ? `Edit ${invoice.invoice_number}` : 'Edit invoice'}
        description="Changes are allowed while the invoice is a draft."
      />

      {isPending || profileQuery.isPending ? (
        <InvoiceFormSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the invoice</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {getErrorMessage(error)}
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : invoice.status !== 'draft' ? (
        <EmptyState
          icon={Lock}
          title="This invoice can no longer be edited"
          description={
            <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
              It is <StatusBadge status={invoice.status} /> — only drafts can be changed. Duplicate it to create an
              editable copy.
            </span>
          }
          action={
            <Button asChild variant="outline">
              <Link to={`/invoices/${invoice.id}`}>View invoice</Link>
            </Button>
          }
        />
      ) : (
        <InvoiceForm
          key={invoice.id}
          mode="edit"
          defaultValues={buildEditDefaults(invoice)}
          initialClient={invoice.client}
          paymentTermsDays={profileQuery.data?.default_payment_terms_days ?? FALLBACK_TERMS_DAYS}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/invoices/${invoice.id}`)}
        />
      )}
    </PageWrapper>
  )
}
