import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { GradientButton } from '@/components/ui/GradientButton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { clientFormSchema, toClientPayload, toFormValues, type ClientFormValues } from '@/components/clients/clientFormSchema'
import type { ClientCreate } from '@/types'

export interface ClientFormProps {
  defaultValues?: Partial<ClientCreate>
  onSubmit: (values: ClientCreate) => Promise<void> | void
  submitLabel?: string
  isSubmitting?: boolean
  onCancel?: () => void
  /** Name / email / company only (quick add from the invoice form). */
  compact?: boolean
  className?: string
}

function Optional({ text = 'optional' }: { text?: string }) {
  return <span className="font-normal text-muted-foreground">({text})</span>
}

/** Create / edit client form. Reused by the client pages and QuickAddClientDialog. */
export function ClientForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save client',
  isSubmitting = false,
  onCancel,
  compact = false,
  className,
}: ClientFormProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: toFormValues(defaultValues),
    mode: 'onTouched',
  })

  const busy = isSubmitting || form.formState.isSubmitting

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(toClientPayload(values, compact))
  })

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          // Stop the submit from bubbling to an outer form (QuickAdd dialog inside the invoice form).
          event.stopPropagation()
          void submit(event)
        }}
        noValidate
        className={cn('flex flex-col gap-5', className)}
      >
        <div className={cn('grid gap-4', !compact && 'sm:grid-cols-2')}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className={cn(!compact && 'sm:col-span-2')}>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Cooper" autoComplete="off" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email <Optional />
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder="jane@acme.com" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Company <Optional />
                </FormLabel>
                <FormControl>
                  <Input placeholder="Acme Inc." autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!compact && (
            <>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Phone <Optional />
                    </FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 555 0100" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tax ID <Optional />
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="VAT / GST number" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      Address <Optional />
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Street, city, postal code, country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      Notes <Optional text="optional, private" />
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Anything worth remembering about this client" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
          <GradientButton type="submit" loading={busy}>
            {submitLabel}
          </GradientButton>
        </div>
      </form>
    </Form>
  )
}

export default ClientForm
