import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryClient'
import { deleteLogo, updateBusinessProfile, uploadLogo } from '@/services/settingsService'
import type { BusinessProfile, BusinessProfileUpdate } from '@/types/settings'

/** Store the fresh profile in the cache and refetch anything keyed under it. */
function useApplyProfile(): (profile: BusinessProfile) => void {
  const queryClient = useQueryClient()
  return (profile: BusinessProfile) => {
    queryClient.setQueryData(queryKeys.settings.business, profile)
    void queryClient.invalidateQueries({
      queryKey: queryKeys.settings.business,
    })
  }
}

export function useUpdateBusinessProfile(): UseMutationResult<BusinessProfile, unknown, BusinessProfileUpdate> {
  const applyProfile = useApplyProfile()
  return useMutation({
    mutationFn: updateBusinessProfile,
    onSuccess: applyProfile,
  })
}

export function useUploadLogo(): UseMutationResult<BusinessProfile, unknown, File> {
  const applyProfile = useApplyProfile()
  return useMutation({
    mutationFn: uploadLogo,
    onSuccess: applyProfile,
  })
}

export function useDeleteLogo(): UseMutationResult<BusinessProfile, unknown, void> {
  const applyProfile = useApplyProfile()
  return useMutation({
    mutationFn: () => deleteLogo(),
    onSuccess: applyProfile,
  })
}
