import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, UserPlus } from 'lucide-react'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { AnimatedInput } from '@/components/ui/AnimatedInput'
import { GradientButton } from '@/components/ui/GradientButton'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/services/api'
import type { User } from '@/types'

const emailSchema = z.email()

/** Password rules mirror the API (8–72 characters; bcrypt limit). */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')

const registerSchema = z
  .object({
    full_name: z.string().trim().min(1, 'Full name is required').max(255, 'Full name must be at most 255 characters'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .max(255, 'Email must be at most 255 characters')
      .refine((value) => emailSchema.safeParse(value).success, 'Enter a valid email address'),
    password: passwordSchema,
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>

export interface RegisterFormProps {
  /** Called after the account is created and the user is signed in. */
  onSuccess?: (user: User) => void
}

/** Sign-up form: full name, email, password + confirmation. */
export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register: registerAccount } = useAuth()
  const [apiError, setApiError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '' },
  })

  const onSubmit = async (values: RegisterFormValues): Promise<void> => {
    setApiError(null)
    try {
      const user = await registerAccount({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
      })
      onSuccess?.(user)
    } catch (err: unknown) {
      setApiError(getErrorMessage(err, 'Unable to create your account. Please try again.'))
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
        label="Full name"
        autoComplete="name"
        placeholder="Jane Doe"
        autoFocus
        error={errors.full_name?.message}
        {...register('full_name')}
      />
      <AnimatedInput
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <AnimatedInput
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        error={errors.password?.message}
        {...register('password')}
      />
      <AnimatedInput
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        placeholder="Repeat your password"
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />
      <GradientButton type="submit" size="lg" className="w-full" loading={isSubmitting}>
        {!isSubmitting && <UserPlus aria-hidden="true" />}
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </GradientButton>
    </form>
  )
}

export default RegisterForm
