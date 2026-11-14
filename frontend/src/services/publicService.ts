import api, { resolveApiUrl } from '@/services/api'
import type { PublicInvoice } from '@/types'

export const publicInvoiceKeys = {
  detail: (token: string) => ['public-invoice', token] as const,
}

/** GET /public/invoices/{token} — no auth; never triggers a token refresh. */
export async function getPublicInvoice(token: string): Promise<PublicInvoice> {
  const { data } = await api.get<PublicInvoice>(`/public/invoices/${encodeURIComponent(token)}`, {
    skipAuthRefresh: true,
  })
  return data
}

/** Absolute URL of the public PDF (plain link, no auth needed). */
export function publicInvoicePdfUrl(token: string): string {
  return resolveApiUrl(`/api/v1/public/invoices/${encodeURIComponent(token)}/pdf`) ?? ''
}

export const publicService = { getPublicInvoice, publicInvoicePdfUrl }

export default publicService
