import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  clientKeys,
  createClient,
  deleteClient,
  getClient,
  listClientInvoices,
  listClients,
  updateClient,
} from '@/services/clientService'
import type { Client, ClientCreate, ClientListParams, ClientUpdate, PageParams } from '@/types'

/** Paginated / searchable client list. Keeps the previous page visible while the next loads. */
export function useClientsList(params: ClientListParams = {}) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => listClients(params),
    placeholderData: keepPreviousData,
  })
}

/** Client detail with stats. Disabled for invalid ids. */
export function useClient(id: number | undefined) {
  const valid = typeof id === 'number' && Number.isInteger(id) && id > 0
  return useQuery({
    queryKey: clientKeys.detail(valid ? id : 0),
    queryFn: () => getClient(id as number),
    enabled: valid,
  })
}

/** A client's invoices, paginated. */
export function useClientInvoices(id: number | undefined, params: PageParams = {}) {
  const valid = typeof id === 'number' && Number.isInteger(id) && id > 0
  return useQuery({
    queryKey: clientKeys.invoices(valid ? id : 0, params),
    queryFn: () => listClientInvoices(id as number, params),
    enabled: valid,
    placeholderData: keepPreviousData,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation<Client, unknown, ClientCreate>({
    mutationFn: (payload) => createClient(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.all })
    },
  })
}

export function useUpdateClient(id: number) {
  const queryClient = useQueryClient()
  return useMutation<Client, unknown, ClientUpdate>({
    mutationFn: (payload) => updateClient(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.all })
      // Invoices embed a client summary; refresh them too.
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation<void, unknown, number>({
    mutationFn: (id) => deleteClient(id),
    onSuccess: (_data, id) => {
      // Do not refetch the deleted client's detail (it would 404 while the page unmounts).
      queryClient.removeQueries({ queryKey: clientKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
