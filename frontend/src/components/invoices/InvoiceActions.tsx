import { useState } from 'react'
import { CheckCircle2, Copy, Download, ExternalLink, Files, Link2Off, Loader2, MoreHorizontal, Pencil, Send, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GradientButton } from '@/components/ui/GradientButton'
import { useDeleteInvoice, useDuplicateInvoice, useMarkPaid, useRevokeLink } from '@/hooks/useInvoices'
import { getErrorMessage } from '@/services/api'
import { downloadInvoicePdf } from '@/services/invoiceService'
import type { Invoice } from '@/types'

import { shareLink, useSendAndShare } from './useSendAndShare'

export interface InvoiceActionsProps {
  invoice: Invoice
}

type ConfirmKind = 'delete' | 'revoke' | null

/** Toolbar for the invoice detail page: send, share, PDF, mark paid, duplicate, edit, delete, revoke. */
export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const navigate = useNavigate()
  const { sendAndShare, isSending } = useSendAndShare()
  const markPaid = useMarkPaid()
  const duplicate = useDuplicateInvoice()
  const remove = useDeleteInvoice()
  const revoke = useRevokeLink()
  const [downloading, setDownloading] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)

  const isDraft = invoice.status === 'draft'
  const canMarkPaid = invoice.status === 'sent' || invoice.status === 'overdue'
  const publicUrl = invoice.public_url ?? null

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoice_number)
    } catch (err: unknown) {
      toast.error('Could not download the PDF', { description: getErrorMessage(err) })
    } finally {
      setDownloading(false)
    }
  }

  const handleMarkPaid = async () => {
    try {
      await markPaid.mutateAsync(invoice.id)
      toast.success(`${invoice.invoice_number} marked as paid`)
    } catch (err: unknown) {
      toast.error('Could not mark as paid', { description: getErrorMessage(err) })
    }
  }

  const handleDuplicate = async () => {
    try {
      const copy = await duplicate.mutateAsync(invoice.id)
      toast.success(`Duplicated as ${copy.invoice_number}`, { description: 'Review the draft and send it when ready.' })
      navigate(`/invoices/${copy.id}/edit`)
    } catch (err: unknown) {
      toast.error('Could not duplicate the invoice', { description: getErrorMessage(err) })
    }
  }

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(invoice.id)
      toast.success(`${invoice.invoice_number} deleted`)
      setConfirm(null)
      navigate('/invoices', { replace: true })
    } catch (err: unknown) {
      toast.error('Could not delete the invoice', { description: getErrorMessage(err) })
    }
  }

  const handleRevoke = async () => {
    try {
      const updated = await revoke.mutateAsync(invoice.id)
      setConfirm(null)
      if (updated.public_url) await shareLink(updated.public_url, 'The old link no longer works. The new one is on your clipboard.')
      else toast.success('Link revoked')
    } catch (err: unknown) {
      toast.error('Could not revoke the link', { description: getErrorMessage(err) })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isDraft && (
        <GradientButton loading={isSending} onClick={() => void sendAndShare(invoice.id)}>
          {!isSending && <Send aria-hidden="true" />}
          Send
        </GradientButton>
      )}
      {canMarkPaid && (
        <GradientButton loading={markPaid.isPending} onClick={() => void handleMarkPaid()}>
          {!markPaid.isPending && <CheckCircle2 aria-hidden="true" />}
          Mark as paid
        </GradientButton>
      )}
      {publicUrl && (
        <>
          <Button variant="outline" onClick={() => void shareLink(publicUrl)}>
            <Copy aria-hidden="true" />
            Copy link
          </Button>
          <Button variant="outline" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" />
              Open link
            </a>
          </Button>
        </>
      )}
      <Button variant="outline" onClick={() => void handleDownload()} disabled={downloading}>
        {downloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
        Download PDF
      </Button>
      {isDraft && (
        <Button variant="outline" asChild>
          <Link to={`/invoices/${invoice.id}/edit`}>
            <Pencil aria-hidden="true" />
            Edit
          </Link>
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions">
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled={duplicate.isPending} onSelect={() => void handleDuplicate()}>
            <Files aria-hidden="true" />
            Duplicate
          </DropdownMenuItem>
          {invoice.public_token && (
            <DropdownMenuItem onSelect={() => setConfirm('revoke')}>
              <Link2Off aria-hidden="true" />
              Revoke link
            </DropdownMenuItem>
          )}
          {isDraft && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm('delete')}>
                <Trash2 aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Delete ${invoice.invoice_number}?`}
        description="This draft will be permanently removed. This cannot be undone."
        confirmLabel="Delete draft"
        destructive
        loading={remove.isPending}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={confirm === 'revoke'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Revoke the public link?"
        description="A new link will be generated. Anyone with the old link (including your client) will no longer be able to open this invoice, so you'll need to share the new one."
        confirmLabel="Revoke & regenerate"
        destructive
        loading={revoke.isPending}
        onConfirm={handleRevoke}
      />
    </div>
  )
}
