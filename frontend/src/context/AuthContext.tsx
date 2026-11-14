import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { queryClient } from '@/lib/queryClient'
import { AUTH_LOGOUT_EVENT, refreshAccessToken, tokenStorage } from '@/services/api'
import { authService } from '@/services/authService'
import type { RegisterRequest, User } from '@/types'

export interface AuthContextValue {
  /** The signed-in user, or null. */
  user: User | null
  /** True once a user is loaded. */
  isAuthenticated: boolean
  /** True while the initial session bootstrap (refresh + /auth/me) is running. */
  isLoading: boolean
  isAdmin: boolean
  /** Email/password login. Throws on failure (use getErrorMessage). */
  login: (email: string, password: string) => Promise<User>
  /** Create an account and sign in. Throws on failure. */
  register: (payload: RegisterRequest) => Promise<User>
  /** Revoke the refresh token server-side (best effort) and clear local state. */
  logout: () => Promise<void>
  /** Re-fetch /auth/me (e.g. after profile update). */
  refreshUser: () => Promise<User | null>
  /** Replace the cached user (e.g. with the PUT /auth/me response). */
  setUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(() => tokenStorage.getRefreshToken() !== null)
  const bootstrapped = useRef(false)

  const clearSession = useCallback(() => {
    tokenStorage.clear()
    setUserState(null)
    queryClient.clear()
  }, [])

  // Bootstrap: refresh token in storage -> new access token -> /auth/me.
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    if (!tokenStorage.getRefreshToken()) return

    refreshAccessToken()
      .then(() => authService.me())
      .then((me) => setUserState(me))
      .catch(() => {
        tokenStorage.clear()
        setUserState(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  // Session expired elsewhere (interceptor could not refresh).
  useEffect(() => {
    const handleLogout = () => {
      setUserState(null)
      queryClient.clear()
    }
    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout)
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const tokens = await authService.login({ email, password })
    tokenStorage.setTokens(tokens)
    try {
      const me = await authService.me()
      setUserState(me)
      return me
    } catch (err) {
      tokenStorage.clear()
      throw err
    }
  }, [])

  const register = useCallback(async (payload: RegisterRequest): Promise<User> => {
    const tokens = await authService.register(payload)
    tokenStorage.setTokens(tokens)
    try {
      const me = await authService.me()
      setUserState(me)
      return me
    } catch (err) {
      tokenStorage.clear()
      throw err
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = tokenStorage.getRefreshToken()
    try {
      if (refreshToken) await authService.logout(refreshToken)
    } catch {
      // Best effort: the local session is cleared regardless.
    } finally {
      clearSession()
    }
  }, [clearSession])

  const refreshUser = useCallback(async (): Promise<User | null> => {
    if (!tokenStorage.hasSession()) return null
    try {
      const me = await authService.me()
      setUserState(me)
      return me
    } catch {
      return null
    }
  }, [])

  const setUser = useCallback((next: User) => setUserState(next), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      isAdmin: user?.is_admin ?? false,
      login,
      register,
      logout,
      refreshUser,
      setUser,
    }),
    [user, isLoading, login, register, logout, refreshUser, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
