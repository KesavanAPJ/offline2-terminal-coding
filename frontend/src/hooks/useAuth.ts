import { useContext } from 'react'

import { AuthContext, type AuthContextValue } from '@/context/AuthContext'

/** Access the auth state/actions. Must be used inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
