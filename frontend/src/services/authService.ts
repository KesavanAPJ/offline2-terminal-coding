import { api } from '@/services/api'
import type {
  ChangePasswordRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  TokenResponse,
  UpdateProfileRequest,
  User,
} from '@/types'

/** Typed calls for /api/v1/auth/*. Token persistence is handled by AuthContext. */
export const authService = {
  async login(payload: LoginRequest): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>('/auth/login', payload, { skipAuthRefresh: true })
    return data
  },

  async register(payload: RegisterRequest): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>('/auth/register', payload, { skipAuthRefresh: true })
    return data
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>(
      '/auth/refresh',
      { refresh_token: refreshToken },
      { skipAuthRefresh: true },
    )
    return data
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post<MessageResponse | null>('/auth/logout', { refresh_token: refreshToken }, { skipAuthRefresh: true })
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me')
    return data
  },

  async updateMe(payload: UpdateProfileRequest): Promise<User> {
    const { data } = await api.put<User>('/auth/me', payload)
    return data
  },

  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    await api.put<MessageResponse | null>('/auth/me/password', payload)
  },
}
