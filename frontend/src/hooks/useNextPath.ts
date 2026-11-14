import { useSearchParams } from 'react-router-dom'

/** Only allow same-origin, absolute in-app paths (blocks "//evil.com" and "https://..."). */
export function sanitizeNextPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (value.startsWith('/login') || value.startsWith('/register')) return fallback
  return value
}

/** The post-login redirect target from `?next=`, sanitized. */
export function useNextPath(fallback = '/dashboard'): string {
  const [params] = useSearchParams()
  return sanitizeNextPath(params.get('next'), fallback)
}
