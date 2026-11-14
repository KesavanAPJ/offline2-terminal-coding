import { useId, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

import { AnimatedInput } from '@/components/ui/AnimatedInput'
import { GradientButton } from '@/components/ui/GradientButton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/services/api'
import type { BusinessProfile } from '@/types/settings'

import {
  businessProfileSchema,
  toBusinessProfilePayload,
  toBusinessProfileValues,
  type BusinessProfileFormValues,
} from './settingsSchemas'
import { useUpdateBusinessProfile } from './useSettingsMutations'

export interface BusinessProfileFormProps {
  profile: BusinessProfile
}

/** Business identity shown on invoices: name, contact details, tax ID and payment instructions. */
export function BusinessProfileForm({ profile }: BusinessProfileFormProps) {
  const addressId = useId()
  const instructionsId = useId()
  const values = useMemo(() => toBusinessProfileValues(profile), [profile])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  })

  const mutation = useUpdateBusinessProfile()

  const onSubmit = (formValues: BusinessProfileFormValues): void => {
    mutation.mutate(toBusinessProfilePayload(formValues), {
      onSuccess: (updated) => {
        reset(toBusinessProfileValues(updated))
        toast.success('Business profile saved')
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, 'Could not save your business profile.'))
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <AnimatedInput
          label="Business name"
          autoComplete="organization"
          placeholder="Acme Studio"
          error={errors.business_name?.message}
          {...register('business_name')}
        />
        <AnimatedInput
          label="Billing email"
          type="email"
          autoComplete="email"
          placeholder="billing@acme.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <AnimatedInput
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder="+1 555 0100"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <AnimatedInput
          label="Tax ID / VAT number"
          placeholder="e.g. GB123456789"
          error={errors.tax_id?.message}
          {...register('tax_id')}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={addressId}>Address</Label>
        <Textarea
          id={addressId}
          rows={3}
          autoComplete="street-address"
          placeholder={'123 Market Street\nSan Francisco, CA 94103'}
          aria-invalid={errors.address ? true : undefined}
          {...register('address')}
        />
        {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={instructionsId}>Payment instructions</Label>
        <Textarea
          id={instructionsId}
          rows={4}
          placeholder="Bank transfer to IBAN … / Pay via the link on this invoice"
          aria-invalid={errors.payment_instructions ? true : undefined}
          {...register('payment_instructions')}
        />
        {errors.payment_instructions ? (
          <p className="text-sm text-destructive">{errors.payment_instructions.message}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Printed at the bottom of every invoice.</p>
        )}
      </div>

      <div className="flex justify-end">
        <GradientButton type="submit" loading={mutation.isPending} disabled={!isDirty}>
          {!mutation.isPending && <Save aria-hidden="true" />}
          Save profile
        </GradientButton>
      </div>
    </form>
  )
}

export default BusinessProfileForm
