import api from '@/services/api'
import type { DashboardSummary, InvoiceListItem, Page, RecentInvoice, RevenuePoint, TopClient } from '@/types'

/**
 * Query keys for the dashboard. Everything lives under `['dashboard']`, so any module that
 * invalidates `dashboardKeys.all` (or `queryKeys.dashboard.all`) refreshes every card.
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => ['dashboard', 'summary'] as const,
  recent: (limit: number) => ['dashboard', 'recent', limit] as const,
  revenue: (months: number) => ['dashboard', 'revenue', months] as const,
  topClients: (limit: number) => ['dashboard', 'top-clients', limit] as const,
  overdue: (size: number) => ['dashboard', 'overdue', size] as const,
}

/** GET /dashboard/summary — per-currency totals and per-status counts. */
export async function getSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/dashboard/summary')
  return data
}

/** GET /dashboard/recent — most recently updated invoices (limit 1–50). */
export async function getRecentInvoices(limit = 10): Promise<RecentInvoice[]> {
  const { data } = await api.get<RecentInvoice[]>('/dashboard/recent', {
    params: { limit },
  })
  return data
}

/** GET /dashboard/revenue — monthly paid revenue per currency (months 1–36). */
export async function getRevenue(months = 12): Promise<RevenuePoint[]> {
  const { data } = await api.get<RevenuePoint[]>('/dashboard/revenue', {
    params: { months },
  })
  return data
}

/** GET /dashboard/top-clients — clients ranked by paid revenue (limit 1–20). */
export async function getTopClients(limit = 5): Promise<TopClient[]> {
  const { data } = await api.get<TopClient[]>('/dashboard/top-clients', {
    params: { limit },
  })
  return data
}

/** GET /invoices?status=overdue — first page of overdue invoices for the dashboard list. */
export async function getOverdueInvoices(size = 5): Promise<Page<InvoiceListItem>> {
  const { data } = await api.get<Page<InvoiceListItem>>('/invoices', {
    params: { status: 'overdue', page: 1, size },
  })
  return data
}

export const dashboardService = {
  getSummary,
  getRecentInvoices,
  getRevenue,
  getTopClients,
  getOverdueInvoices,
}

export default dashboardService
