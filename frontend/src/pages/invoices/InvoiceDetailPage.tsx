import { ArrowLeft, Link2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InvoiceActions } from '@/components/invoices/InvoiceActions'
import { InvoicePreview } from '@/components/invoices/InvoicePreview'
import { previewFromInvoice } from '@/components/invoices/invoicePreviewData'
import { InvoiceTimeline } from '@/components/invoices/InvoiceTimeline'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoice } from '@/hooks/useInvoices'
import { formatMoney } from '@/lib/format'
import { getErrorMessage, getErrorStatus } from '@/services/api'
import { useBusinessProfile } from '@/services/settingsService'

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]" aria-busy="true" aria-label="Loading invoice">
      <Skeleton className="h-[36rem] w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  )
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const invoiceId = Number(id)
  const validId = Number.isInteger(invoiceId) && invoiceId > 0
  const { data: invoice, isPending, isError, error, refetch } = useInvoice(invoiceId)
  const { data: profile } = useBusinessProfile()

  const backLink = (
    <Link to="/invoices" className="inline-flex items-center gap-1 hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Invoices
    </Link>
  )

  if (!validId || (isError && getErrorStatus(error) === 404)) {
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

  if (isPending) {
    return (
      <PageWrapper>
        <PageHeader eyebrow={backLink} title="Invoice" />
        <DetailSkeleton />
      </PageWrapper>
    )
  }

  if (isError) {
    return (
      <PageWrapper>
        <PageHeader eyebrow={backLink} title="Invoice" />
        <Alert variant="destructive">
          <AlertTitle>Could not load the invoice</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {getErrorMessage(error)}
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        eyebrow={backLink}
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            <span className="font-mono">{invoice.invoice_number}</span>
            <StatusBadge status={invoice.status} className="text-sm" />
          </span>
        }
        description={
          <>
            {formatMoney(invoice.total, invoice.currency)} for{' '}
            <Link to={`/clients/${invoice.client.id}`} className="font-medium text-foreground hover:underline">
              {invoice.client.name}
            </Link>
          </>
        }
      />

      <InvoiceActions invoice={invoice} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <InvoicePreview data={previewFromInvoice(invoice, profile)} />

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <GlassCard static className="space-y-4">
            <h2 className="text-sm font-semibold">Activity</h2>
            <InvoiceTimeline invoice={invoice} />
          </GlassCard>
          {invoice.public_url ? (
            <GlassCard static className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="size-4" aria-hidden="true" />
                Public link
              </h2>
              <p className="break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-muted-foreground">
                {invoice.public_url}
              </p>
              <p className="text-xs text-muted-foreground">Anyone with this link can view and download the invoice.</p>
            </GlassCard>
          ) : (
            invoice.status === 'draft' && (
              <GlassCard static className="space-y-1">
                <h2 className="text-sm font-semibold">Not shared yet</h2>
                <p className="text-xs text-muted-foreground">
                  Send the invoice to create a shareable link — it is copied to your clipboard automatically.
                </p>
              </GlassCard>
            )
          )}
        </aside>
      </div>
    </PageWrapper>
  )
}
