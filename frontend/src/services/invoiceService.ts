import api, { downloadFile } from '@/services/api'
import type {
  Invoice,
  InvoiceCreate,
  InvoiceListItem,
  InvoiceListParams,
  InvoiceUpdate,
  Page,
  SendInvoiceResponse,
} from '@/types'

/** Query keys for the invoices module (prefix-compatible with `queryKeys.invoices` in lib/queryClient). */
export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => ['invoices', 'list'] as const,
  list: (params: InvoiceListParams) => ['invoices', 'list', params] as const,
  detail: (id: number) => ['invoices', 'detail', id] as const,
}

/** Drop undefined / null / empty-string query params. */
function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as Partial<T>
}

function hasInvoice(data: Invoice | SendInvoiceResponse): data is SendInvoiceResponse {
  return typeof data === 'object' && data !== null && 'invoice' in data && 'public_url' in data
}

/** GET /invoices — paginated, filterable by status / client / issue-date range. */
export async function listInvoices(params: InvoiceListParams = {}): Promise<Page<InvoiceListItem>> {
  const { data } = await api.get<Page<InvoiceListItem>>('/invoices', { params: cleanParams(params) })
  return data
}

/** GET /invoices/{id} */
export async function getInvoice(id: number): Promise<Invoice> {
  const { data } = await api.get<Invoice>(`/invoices/${id}`)
  return data
}

/** POST /invoices — creates a draft; the server allocates the number and computes totals. */
export async function createInvoice(payload: InvoiceCreate): Promise<Invoice> {
  const { data } = await api.post<Invoice>('/invoices', payload)
  return data
}

/** PUT /invoices/{id} — rejects with 409 when the invoice is no longer a draft. */
export async function updateInvoice(id: number, payload: InvoiceUpdate): Promise<Invoice> {
  const { data } = await api.put<Invoice>(`/invoices/${id}`, payload)
  return data
}

/** DELETE /invoices/{id} — drafts only. */
export async function deleteInvoice(id: number): Promise<void> {
  await api.delete(`/invoices/${id}`)
}

/** POST /invoices/{id}/send — draft → sent; returns the invoice and its public link. */
export async function sendInvoice(id: number): Promise<SendInvoiceResponse> {
  const { data } = await api.post<SendInvoiceResponse>(`/invoices/${id}/send`)
  return data
}

/** POST /invoices/{id}/mark-paid — sent/overdue → paid. */
export async function markInvoicePaid(id: number): Promise<Invoice> {
  const { data } = await api.post<Invoice>(`/invoices/${id}/mark-paid`)
  return data
}

/**
 * POST /invoices/{id}/revoke-link — regenerates the public token (old link stops working).
 * Accepts either a bare Invoice or a `{ invoice, public_url }` body.
 */
export async function revokeInvoiceLink(id: number): Promise<Invoice> {
  const { data } = await api.post<Invoice | SendInvoiceResponse>(`/invoices/${id}/revoke-link`)
  if (hasInvoice(data)) return { ...data.invoice, public_url: data.public_url }
  return data
}

/** POST /invoices/{id}/duplicate — copies the invoice as a new draft. */
export async function duplicateInvoice(id: number): Promise<Invoice> {
  const { data } = await api.post<Invoice>(`/invoices/${id}/duplicate`)
  return data
}

/** GET /invoices/{id}/pdf through the authenticated client and save it. */
export async function downloadInvoicePdf(id: number, invoiceNumber: string): Promise<void> {
  await downloadFile(`/invoices/${id}/pdf`, `${invoiceNumber || `invoice-${id}`}.pdf`)
}

export const invoiceService = {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  markInvoicePaid,
  revokeInvoiceLink,
  duplicateInvoice,
  downloadInvoicePdf,
}

export default invoiceService
