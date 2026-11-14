import api from '@/services/api'
import type {
  Client,
  ClientCreate,
  ClientListParams,
  ClientUpdate,
  ClientWithStats,
  InvoiceListItem,
  Page,
  PageParams,
} from '@/types'

/** Query keys for the clients module (prefix-compatible with `queryKeys.clients` in lib/queryClient). */
export const clientKeys = {
  all: ['clients'] as const,
  lists: () => ['clients', 'list'] as const,
  list: (params: ClientListParams) => ['clients', 'list', params] as const,
  detail: (id: number) => ['clients', 'detail', id] as const,
  invoices: (id: number, params: PageParams) => ['clients', 'detail', id, 'invoices', params] as const,
}

/** Drop undefined / empty-string query params so they are not sent as `?q=`. */
function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as Partial<T>
}

/** GET /clients — paginated, optional `q` search over name/email/company. */
export async function listClients(params: ClientListParams = {}): Promise<Page<Client>> {
  const { data } = await api.get<Page<Client>>('/clients', { params: cleanParams(params) })
  return data
}

/** GET /clients/{id} — client plus invoice stats. */
export async function getClient(id: number): Promise<ClientWithStats> {
  const { data } = await api.get<ClientWithStats>(`/clients/${id}`)
  return data
}

/** POST /clients */
export async function createClient(payload: ClientCreate): Promise<Client> {
  const { data } = await api.post<Client>('/clients', payload)
  return data
}

/** PUT /clients/{id} */
export async function updateClient(id: number, payload: ClientUpdate): Promise<Client> {
  const { data } = await api.put<Client>(`/clients/${id}`, payload)
  return data
}

/** DELETE /clients/{id} — rejects with 409 when the client has sent/paid invoices. */
export async function deleteClient(id: number): Promise<void> {
  await api.delete(`/clients/${id}`)
}

/** GET /clients/{id}/invoices */
export async function listClientInvoices(id: number, params: PageParams = {}): Promise<Page<InvoiceListItem>> {
  const { data } = await api.get<Page<InvoiceListItem>>(`/clients/${id}/invoices`, { params: cleanParams(params) })
  return data
}

export const clientService = {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  listClientInvoices,
}

export default clientService
