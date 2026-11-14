import { toast } from 'sonner'

import { useSendInvoice } from '@/hooks/useInvoices'
import { getErrorMessage } from '@/services/api'
import type { Invoice } from '@/types'

import { copyToClipboard } from './clipboard'

/** Show the "link copied" (or "here's the link") toast for a public URL. */
export async function shareLink(
  url: string,
  description = 'Paste it into an email or chat to your client.',
): Promise<void> {
  const copied = await copyToClipboard(url)
  if (copied) {
    toast.success('Link copied', { description })
  } else {
    toast.success('Invoice link ready', { description: url, duration: 10_000 })
  }
}

/**
 * Send an invoice (draft → sent), copy its public link, and toast.
 * Resolves with the sent invoice, or null when sending failed (an error toast is shown).
 */
export function useSendAndShare() {
  const sendMutation = useSendInvoice()

  const sendAndShare = async (invoiceId: number): Promise<Invoice | null> => {
    try {
      const { invoice, public_url } = await sendMutation.mutateAsync(invoiceId)
      const url = public_url || invoice.public_url
      if (url) await shareLink(url, 'Invoice sent. Paste the link into an email or chat to your client.')
      else toast.success('Invoice sent')
      return invoice
    } catch (err: unknown) {
      toast.error('Could not send the invoice', { description: getErrorMessage(err) })
      return null
    }
  }

  return { sendAndShare, isSending: sendMutation.isPending }
}
