import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import { LoadingScreen } from '@/components/common/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'
import { useNextPath } from '@/hooks/useNextPath'

export interface GuestRouteProps {
  children?: ReactNode
}

/** For /login and /register: signed-in users are sent to `?next=` or /dashboard. */
export function GuestRoute({ children }: GuestRouteProps) {
  const { user, isLoading } = useAuth()
  const next = useNextPath()

  if (isLoading) return <LoadingScreen fullScreen />
  if (user) return <Navigate to={next} replace />

  return children ? <>{children}</> : <Outlet />
}
