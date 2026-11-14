import { toast } from 'sonner'

import { ClientForm } from '@/components/clients/ClientForm'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCreateClient } from '@/hooks/useClients'
import { getErrorMessage } from '@/services/api'
import type { Client, ClientCreate } from '@/types'

export interface QuickAddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (client: Client) => void
  /** Prefill the name (e.g. what was typed in the client combobox). */
  initialName?: string
}

/** Create a client without leaving the current page (used by the invoice form). */
export function QuickAddClientDialog({ open, onOpenChange, onCreated, initialName }: QuickAddClientDialogProps) {
  const createClient = useCreateClient()

  const handleSubmit = async (values: ClientCreate): Promise<void> => {
    try {
      const client = await createClient.mutateAsync(values)
      toast.success(`Client "${client.name}" added`)
      onCreated(client)
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Could not create the client.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !createClient.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
          <DialogDescription>Just the essentials. You can add more details later.</DialogDescription>
        </DialogHeader>
        {open && (
          <ClientForm
            key={initialName ?? ''}
            compact
            defaultValues={{ name: initialName ?? '' }}
            onSubmit={handleSubmit}
            submitLabel="Add client"
            isSubmitting={createClient.isPending}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default QuickAddClientDialog
