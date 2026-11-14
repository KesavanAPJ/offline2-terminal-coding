import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import {
  createInvoice,
  deleteInvoice,
  duplicateInvoice,
  getInvoice,
  invoiceKeys,
  listInvoices,
  markInvoicePaid,
  revokeInvoiceLink,
  sendInvoice,
  updateInvoice,
} from '@/services/invoiceService'
import type { Invoice, InvoiceCreate, InvoiceListParams, InvoiceUpdate, SendInvoiceResponse } from '@/types'

/** Invoices embed clients and feed the dashboard: refresh all three after any mutation. */
function invalidateRelated(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
  void queryClient.invalidateQueries({ queryKey: ['clients'] })
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
}

/** Seed the detail cache with a fresh invoice so the next page renders instantly. */
function primeDetail(queryClient: QueryClient, invoice: Invoice): void {
  queryClient.setQueryData(invoiceKeys.detail(invoice.id), invoice)
}

function isValidId(id: number | undefined): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0
}

/** Paginated invoice list. Keeps the previous page visible while the next loads. */
export function useInvoicesList(params: InvoiceListParams = {}) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => listInvoices(params),
    placeholderData: keepPreviousData,
  })
}

/** Invoice detail. Disabled for invalid ids. */
export function useInvoice(id: number | undefined) {
  const valid = isValidId(id)
  return useQuery({
    queryKey: invoiceKeys.detail(valid ? id : 0),
    queryFn: () => getInvoice(id as number),
    enabled: valid,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation<Invoice, unknown, InvoiceCreate>({
    mutationFn: (payload) => createInvoice(payload),
    onSuccess: (invoice) => {
      primeDetail(queryClient, invoice)
      invalidateRelated(queryClient)
    },
  })
}

export interface UpdateInvoiceVariables {
  id: number
  payload: InvoiceUpdate
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation<Invoice, unknown, UpdateInvoiceVariables>({
    mutationFn: ({ id, payload }) => updateInvoice(id, payload),
    onSuccess: (invoice) => {
      primeDetail(queryClient, invoice)
      invalidateRelated(queryClient)
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation<void, unknown, number>({
    mutationFn: (id) => deleteInvoice(id),
    onSuccess: (_data, id) => {
      // Do not refetch the deleted invoice (it would 404 while the page unmounts).
      queryClient.removeQueries({ queryKey: invoiceKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: ['clients'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useSendInvoice() {
  const queryClient = useQueryClient()
  return useMutation<SendInvoiceResponse, unknown, number>({
    mutationFn: (id) => sendInvoice(id),
    onSuccess: ({ invoice, public_url }) => {
      primeDetail(queryClient, { ...invoice, public_url: invoice.public_url ?? public_url })
      invalidateRelated(queryClient)
    },
  })
}

export function useMarkPaid() {
  const queryClient = useQueryClient()
  return useMutation<Invoice, unknown, number>({
    mutationFn: (id) => markInvoicePaid(id),
    onSuccess: (invoice) => {
      primeDetail(queryClient, invoice)
      invalidateRelated(queryClient)
    },
  })
}

export function useRevokeLink() {
  const queryClient = useQueryClient()
  return useMutation<Invoice, unknown, number>({
    mutationFn: (id) => revokeInvoiceLink(id),
    onSuccess: (invoice) => {
      primeDetail(queryClient, invoice)
      invalidateRelated(queryClient)
    },
  })
}

export function useDuplicateInvoice() {
  const queryClient = useQueryClient()
  return useMutation<Invoice, unknown, number>({
    mutationFn: (id) => duplicateInvoice(id),
    onSuccess: (invoice) => {
      primeDetail(queryClient, invoice)
      invalidateRelated(queryClient)
    },
  })
}
