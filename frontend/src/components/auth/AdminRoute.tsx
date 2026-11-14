import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export interface AdminRouteProps {
  children?: ReactNode
}

/** Requires `is_admin`; renders a 403 state otherwise. Nest inside <ProtectedRoute>. */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user } = useAuth()

  if (!user?.is_admin) {
    return (
      <PageWrapper>
        <EmptyState
          icon={ShieldAlert}
          title="403 — Admins only"
          description="You don't have permission to view this page."
          action={
            <Button asChild variant="outline">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </PageWrapper>
    )
  }

  return children ? <>{children}</> : <Outlet />
}
