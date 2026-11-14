import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { LoadingScreen } from '@/components/common/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'

export interface ProtectedRouteProps {
  /** Rendered when authenticated; defaults to <Outlet /> for layout routes. */
  children?: ReactNode
}

/** Requires a signed-in user; otherwise redirects to /login?next=<current path>. */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen fullScreen label="Restoring your session…" />

  if (!user) {
    const next = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
