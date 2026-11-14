import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

import type { ApiError, TokenResponse } from '@/types'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Internal: set once a request has been retried after a token refresh. */
    _retry?: boolean
    /** Do not attempt a silent refresh when this request returns 401 (auth endpoints). */
    skipAuthRefresh?: boolean
  }
}

/** Origin of the API, without trailing slash (e.g. "http://localhost:8000"). */
export const API_ORIGIN: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

/** Base URL of the versioned API. */
export const API_BASE_URL = `${API_ORIGIN}/api/v1`

/** localStorage key for the (rotating) refresh token. */
export const REFRESH_TOKEN_KEY = 'invoiceflow.refresh'

/** Window event dispatched when the session can no longer be refreshed. */
export const AUTH_LOGOUT_EVENT = 'auth:logout'

// ---------------------------------------------------------------------------
// Token storage: access token lives in memory only; refresh token in localStorage.
// ---------------------------------------------------------------------------

let accessToken: string | null = null

function readRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

function writeRefreshToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(REFRESH_TOKEN_KEY, token)
    else window.localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // Storage unavailable (private mode / blocked) - session will not survive reloads.
  }
}

export const tokenStorage = {
  getAccessToken: (): string | null => accessToken,
  setAccessToken: (token: string | null): void => {
    accessToken = token
  },
  getRefreshToken: (): string | null => readRefreshToken(),
  /** Persist a token pair from login / register / refresh. */
  setTokens: (tokens: Pick<TokenResponse, 'access_token' | 'refresh_token'>): void => {
    accessToken = tokens.access_token
    writeRefreshToken(tokens.refresh_token)
  },
  clear: (): void => {
    accessToken = null
    writeRefreshToken(null)
  },
  hasSession: (): boolean => accessToken !== null || readRefreshToken() !== null,
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

let refreshPromise: Promise<string> | null = null

/**
 * Exchange the stored refresh token for a new token pair (the refresh token rotates).
 * Single-flight: concurrent callers share one in-flight request.
 * Resolves with the new access token; rejects if there is no refresh token or the refresh fails.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) {
    return Promise.reject(new Error('No refresh token'))
  }

  refreshPromise = axios
    .post<TokenResponse>(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15_000 },
    )
    .then(({ data }) => {
      tokenStorage.setTokens(data)
      return data.access_token
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

/** Clear tokens and notify the app (AuthContext listens) that the session ended. */
export function forceLogout(): void {
  tokenStorage.clear()
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT))
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error)
    }

    const original = error.config
    const status = error.response?.status

    if (status !== 401 || original._retry || original.skipAuthRefresh) {
      return Promise.reject(error)
    }

    if (!tokenStorage.getRefreshToken()) {
      if (tokenStorage.hasSession()) forceLogout()
      return Promise.reject(error)
    }

    original._retry = true
    try {
      const newToken = await refreshAccessToken()
      original.headers.set('Authorization', `Bearer ${newToken}`)
      return api(original)
    } catch (refreshError: unknown) {
      forceLogout()
      return Promise.reject(axios.isAxiosError(refreshError) ? error : refreshError)
    }
  },
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isApiError(data: unknown): data is ApiError {
  return typeof data === 'object' && data !== null && 'detail' in data
}

/** Human-readable message from any thrown value (axios errors, FastAPI `detail`, 422 lists). */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<unknown>
    const data = axiosErr.response?.data
    if (isApiError(data)) {
      const { detail } = data
      if (typeof detail === 'string' && detail.trim()) return detail
      if (Array.isArray(detail) && detail.length > 0) {
        return detail
          .map((item) => {
            const field = item.loc.filter((part) => part !== 'body').join('.')
            return field ? `${field}: ${item.msg}` : item.msg
          })
          .join('; ')
      }
    }
    if (!axiosErr.response) {
      return axiosErr.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : 'Cannot reach the server. Check your connection.'
    }
    if (axiosErr.response.status === 429) return 'Too many requests. Please wait a moment and try again.'
    if (axiosErr.response.status >= 500) return 'Server error. Please try again later.'
    return axiosErr.message || fallback
  }
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err) return err
  return fallback
}

/** HTTP status of an axios error, or undefined. */
export function getErrorStatus(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined
}

/** Resolve an API-relative path (e.g. "/api/v1/files/3" or "/files/3") to an absolute URL. */
export function resolveApiUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/api/')) return `${API_ORIGIN}${path}`
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/** Download a file through the authenticated client (e.g. invoice PDFs) and trigger a browser save. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await api.get<Blob>(path, { responseType: 'blob' })
  const url = window.URL.createObjectURL(response.data)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    window.URL.revokeObjectURL(url)
  }
}

export default api
