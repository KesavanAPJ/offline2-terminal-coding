import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, LogIn } from 'lucide-react'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { AnimatedInput } from '@/components/ui/AnimatedInput'
import { GradientButton } from '@/components/ui/GradientButton'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/services/api'
import type { User } from '@/types'

const emailSchema = z.email()

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(255, 'Email must be at most 255 characters')
    .refine((value) => emailSchema.safeParse(value).success, 'Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export interface LoginFormProps {
  /** Called after a successful sign-in (e.g. to redirect). */
  onSuccess?: (user: User) => void
}

/** Email/password sign-in form. */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth()
  const [apiError, setApiError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    setApiError(null)
    try {
      const user = await login(values.email, values.password)
      onSuccess?.(user)
    } catch (err: unknown) {
      setApiError(getErrorMessage(err, 'Unable to sign in. Please try again.'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {apiError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}
      <AnimatedInput
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        autoFocus
        error={errors.email?.message}
        {...register('email')}
      />
      <AnimatedInput
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />
      <GradientButton type="submit" size="lg" className="w-full" loading={isSubmitting}>
        {!isSubmitting && <LogIn aria-hidden="true" />}
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </GradientButton>
    </form>
  )
}

export default LoginForm
