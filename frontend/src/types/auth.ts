import type { ISODateTime } from './common'

export interface User {
  id: number
  email: string
  full_name: string | null
  is_active: boolean
  is_verified: boolean
  is_admin: boolean
  created_at: ISODateTime
}

/** POST /auth/login (JSON body). */
export interface LoginRequest {
  email: string
  password: string
}

/** POST /auth/register */
export interface RegisterRequest {
  email: string
  password: string
  full_name: string
}

/** Response of /auth/login, /auth/register and /auth/refresh. */
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

/** POST /auth/refresh and POST /auth/logout body. */
export interface RefreshRequest {
  refresh_token: string
}

/** PUT /auth/me */
export interface UpdateProfileRequest {
  full_name?: string | null
  email?: string
}

/** PUT /auth/me/password */
export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}
