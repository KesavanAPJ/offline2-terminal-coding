import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryClient'
import { api } from '@/services/api'
import type { BusinessProfile, BusinessProfileUpdate } from '@/types/settings'

/** GET /settings/business — created server-side with defaults on first access. */
export async function getBusinessProfile(): Promise<BusinessProfile> {
  const { data } = await api.get<BusinessProfile>('/settings/business')
  return data
}

/** PUT /settings/business — partial update; omitted fields are unchanged. */
export async function updateBusinessProfile(payload: BusinessProfileUpdate): Promise<BusinessProfile> {
  const { data } = await api.put<BusinessProfile>('/settings/business', payload)
  return data
}

/** POST /settings/business/logo (multipart field `file`) — PNG, JPEG or WebP. */
export async function uploadLogo(file: File): Promise<BusinessProfile> {
  const form = new FormData()
  form.append('file', file)
  // Override the instance JSON default (axios would otherwise serialize FormData to JSON);
  // in the browser axios then drops the header so the multipart boundary is set automatically.
  const { data } = await api.post<BusinessProfile>('/settings/business/logo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/** DELETE /settings/business/logo */
export async function deleteLogo(): Promise<BusinessProfile> {
  const { data } = await api.delete<BusinessProfile>('/settings/business/logo')
  return data
}

export const settingsService = {
  getBusinessProfile,
  updateBusinessProfile,
  uploadLogo,
  deleteLogo,
}

/** The current user's business profile (query key `['settings', 'business']`). */
export function useBusinessProfile(): UseQueryResult<BusinessProfile> {
  return useQuery({
    queryKey: queryKeys.settings.business,
    queryFn: getBusinessProfile,
  })
}

export default settingsService
