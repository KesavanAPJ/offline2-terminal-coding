import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { AnimatedInput } from '@/components/ui/AnimatedInput'
import { GradientButton } from '@/components/ui/GradientButton'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage, getErrorStatus } from '@/services/api'
import { authService } from '@/services/authService'
import type { UpdateProfileRequest, User } from '@/types'

const emailSchema = z.email()

const profileSchema = z.object({
  full_name: z.string().trim().max(255, 'Full name must be at most 255 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(255, 'Email must be at most 255 characters')
    .refine((value) => emailSchema.safeParse(value).success, 'Enter a valid email address'),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

function toFormValues(user: User): ProfileFormValues {
  return { full_name: user.full_name ?? '', email: user.email }
}

export interface ProfileFormProps {
  user: User
}

/** Edit the signed-in user's name and email (PUT /auth/me). */
export function ProfileForm({ user }: ProfileFormProps) {
  const { setUser } = useAuth()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(user),
  })

  useEffect(() => {
    reset(toFormValues(user))
  }, [user, reset])

  const mutation = useMutation({
    mutationFn: (payload: UpdateProfileRequest) => authService.updateMe(payload),
    onSuccess: (updated) => {
      setUser(updated)
      reset(toFormValues(updated))
      toast.success('Profile updated')
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err, 'Could not update your profile.')
      if (getErrorStatus(err) === 409) setError('email', { message })
      toast.error(message)
    },
  })

  const onSubmit = (values: ProfileFormValues): void => {
    const fullName = values.full_name.trim()
    mutation.mutate({ full_name: fullName === '' ? null : fullName, email: values.email.trim() })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <AnimatedInput
        label="Full name"
        autoComplete="name"
        placeholder="Jane Doe"
        error={errors.full_name?.message}
        {...register('full_name')}
      />
      <AnimatedInput
        label="Email"
        type="email"
        autoComplete="email"
        hint="Used to sign in."
        error={errors.email?.message}
        {...register('email')}
      />
      <div className="flex justify-end">
        <GradientButton type="submit" loading={mutation.isPending} disabled={!isDirty}>
          {!mutation.isPending && <Save aria-hidden="true" />}
          Save changes
        </GradientButton>
      </div>
    </form>
  )
}

export default ProfileForm
