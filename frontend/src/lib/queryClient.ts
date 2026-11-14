import { QueryClient } from '@tanstack/react-query'

import { getErrorStatus } from '@/services/api'

/** Do not retry client errors (4xx); retry transient failures up to twice. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = getErrorStatus(error)
  if (status !== undefined && status >= 400 && status < 500) return false
  return failureCount < 2
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
})

/** Central query keys so modules invalidate consistently. */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  clients: {
    all: ['clients'] as const,
    list: (params: object) => ['clients', 'list', params] as const,
    detail: (id: number) => ['clients', 'detail', id] as const,
    invoices: (id: number) => ['clients', 'detail', id, 'invoices'] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: (params: object) => ['invoices', 'list', params] as const,
    detail: (id: number) => ['invoices', 'detail', id] as const,
  },
  publicInvoice: (token: string) => ['public-invoice', token] as const,
  settings: {
    business: ['settings', 'business'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: ['dashboard', 'summary'] as const,
    recent: ['dashboard', 'recent'] as const,
    revenue: (months: number) => ['dashboard', 'revenue', months] as const,
    topClients: ['dashboard', 'top-clients'] as const,
  },
  admin: {
    users: (params: object) => ['admin', 'users', params] as const,
    stats: ['admin', 'stats'] as const,
  },
} as const
