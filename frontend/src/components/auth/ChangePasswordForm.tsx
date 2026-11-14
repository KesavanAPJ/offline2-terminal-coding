import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { AnimatedInput } from '@/components/ui/AnimatedInput'
import { GradientButton } from '@/components/ui/GradientButton'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage, getErrorStatus } from '@/services/api'
import { authService } from '@/services/authService'

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })
  .refine((values) => values.new_password !== values.current_password, {
    message: 'New password must be different from the current one',
    path: ['new_password'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

const EMPTY: ChangePasswordFormValues = { current_password: '', new_password: '', confirm_password: '' }

/**
 * Change the password (PUT /auth/me/password). The API revokes every refresh token,
 * so we sign in again with the new password to keep this session alive.
 */
export function ChangePasswordForm() {
  const { user, login } = useAuth()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  })

  const mutation = useMutation({
    mutationFn: async (values: ChangePasswordFormValues): Promise<void> => {
      await authService.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      })
      if (user) {
        try {
          await login(user.email, values.new_password)
        } catch {
          // Best effort: the password change itself succeeded.
        }
      }
    },
    onSuccess: () => {
      reset(EMPTY)
      toast.success('Password updated', { description: 'Your other sessions have been signed out.' })
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err, 'Could not change your password.')
      if (getErrorStatus(err) === 400) setError('current_password', { message })
      toast.error(message)
    },
  })

  const onSubmit = (values: ChangePasswordFormValues): void => {
    mutation.mutate(values)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <AnimatedInput
        label="Current password"
        type="password"
        autoComplete="current-password"
        error={errors.current_password?.message}
        {...register('current_password')}
      />
      <AnimatedInput
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="8 to 72 characters."
        error={errors.new_password?.message}
        {...register('new_password')}
      />
      <AnimatedInput
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />
      <div className="flex justify-end">
        <GradientButton type="submit" loading={mutation.isPending}>
          {!mutation.isPending && <KeyRound aria-hidden="true" />}
          Update password
        </GradientButton>
      </div>
    </form>
  )
}

export default ChangePasswordForm
