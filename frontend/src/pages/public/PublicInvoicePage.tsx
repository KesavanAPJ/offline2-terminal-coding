import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileX2, Printer } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { InvoicePreview } from '@/components/invoices/InvoicePreview'
import { previewFromPublic } from '@/components/invoices/invoicePreviewData'
import { Brand } from '@/components/layout/Brand'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatMoney } from '@/lib/format'
import { getErrorMessage, getErrorStatus } from '@/services/api'
import { getPublicInvoice, publicInvoiceKeys, publicInvoicePdfUrl } from '@/services/publicService'

function PoweredBy() {
  return (
    <footer className="flex items-center justify-center gap-2 text-xs text-muted-foreground print:hidden">
      <span>Powered by</span>
      <Brand to={null} className="scale-75" />
    </footer>
  )
}

/** Public, read-only invoice page at /i/:publicToken. No app chrome; print-friendly. */
export default function PublicInvoicePage() {
  const { publicToken = '' } = useParams<{ publicToken: string }>()
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: publicInvoiceKeys.detail(publicToken),
    queryFn: () => getPublicInvoice(publicToken),
    enabled: publicToken.length > 0,
  })

  useEffect(() => {
    if (!data) return
    const previous = document.title
    const from = data.business.business_name ? ` from ${data.business.business_name}` : ''
    document.title = `Invoice ${data.invoice_number}${from}`
    return () => {
      document.title = previous
    }
  }, [data])

  const status = getErrorStatus(error)
  const notFound = !publicToken || (isError && (status === 404 || status === 410 || status === 422))

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8 sm:py-12 print:min-h-0 print:bg-white print:p-0">
      <PageWrapper className="mx-auto max-w-3xl print:max-w-none">
        {notFound ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <FileX2 className="size-7" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Invoice not available</h1>
              <p className="max-w-sm text-sm text-muted-foreground">
                This invoice link is invalid or has been revoked. Please ask the sender for a new link.
              </p>
            </div>
          </div>
        ) : isPending ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading invoice">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-36" />
            </div>
            <Skeleton className="h-[40rem] w-full rounded-2xl" />
          </div>
        ) : isError ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <h1 className="text-xl font-semibold">Could not load this invoice</h1>
            <p className="max-w-sm text-sm text-muted-foreground">{getErrorMessage(error)}</p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <div>
                <p className="text-sm text-muted-foreground">
                  {data.business.business_name ?? 'Invoice'} · {data.invoice_number}
                </p>
                <p className="text-2xl font-semibold tracking-tight tabular">
                  {formatMoney(data.total, data.currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.status === 'paid'
                    ? `Paid${data.paid_at ? ` on ${formatDate(data.paid_at)}` : ''} — thank you!`
                    : `Due ${formatDate(data.due_date)}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer aria-hidden="true" />
                  Print
                </Button>
                <a
                  href={publicInvoicePdfUrl(publicToken)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gradient-from to-gradient-to px-4 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-shadow outline-none hover:shadow-lg hover:shadow-primary/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4"
                >
                  <Download aria-hidden="true" />
                  Download PDF
                </a>
              </div>
            </div>
            <InvoicePreview data={previewFromPublic(data)} />
          </>
        )}
        <PoweredBy />
      </PageWrapper>
    </div>
  )
}
