import { lazy, Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AdminRoute } from '@/components/auth/AdminRoute'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/context/AuthContext'
import { queryClient } from '@/lib/queryClient'

// Route-level code splitting. Phase 2 module agents replace the page files, not this router.
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ProfilePage = lazy(() => import('@/pages/auth/ProfilePage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const ClientsListPage = lazy(() => import('@/pages/clients/ClientsListPage'))
const ClientCreatePage = lazy(() => import('@/pages/clients/ClientCreatePage'))
const ClientDetailPage = lazy(() => import('@/pages/clients/ClientDetailPage'))
const ClientEditPage = lazy(() => import('@/pages/clients/ClientEditPage'))
const InvoicesListPage = lazy(() => import('@/pages/invoices/InvoicesListPage'))
const InvoiceCreatePage = lazy(() => import('@/pages/invoices/InvoiceCreatePage'))
const InvoiceDetailPage = lazy(() => import('@/pages/invoices/InvoiceDetailPage'))
const InvoiceEditPage = lazy(() => import('@/pages/invoices/InvoiceEditPage'))
const PublicInvoicePage = lazy(() => import('@/pages/public/PublicInvoicePage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen fullScreen />}>
      <Routes>
        {/* Public (no app chrome) */}
        <Route path="/i/:publicToken" element={<PublicInvoicePage />} />

        {/* Guests only */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Authenticated app shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route path="/clients" element={<ClientsListPage />} />
            <Route path="/clients/new" element={<ClientCreatePage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/clients/:id/edit" element={<ClientEditPage />} />

            <Route path="/invoices" element={<InvoicesListPage />} />
            <Route path="/invoices/new" element={<InvoiceCreatePage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/invoices/:id/edit" element={<InvoiceEditPage />} />

            <Route path="/settings" element={<SettingsPage />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
