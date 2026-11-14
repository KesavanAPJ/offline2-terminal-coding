import { useNavigate } from 'react-router-dom'
import { AlertCircle, UserX } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'

export interface ClientNotFoundProps {
  /** Non-404 error message; shows a retry button when `onRetry` is given. */
  errorMessage?: string
  onRetry?: () => void
}

/** Friendly state for a missing client (404) or a failed load. */
export function ClientNotFound({ errorMessage, onRetry }: ClientNotFoundProps) {
  const navigate = useNavigate()

  if (errorMessage) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load this client"
        description={errorMessage}
        action={
          <div className="flex gap-2">
            {onRetry && (
              <Button variant="outline" onClick={onRetry}>
                Try again
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate('/clients')}>
              Back to clients
            </Button>
          </div>
        }
      />
    )
  }

  return (
    <EmptyState
      icon={UserX}
      title="Client not found"
      description="This client doesn't exist or may have been deleted."
      action={
        <Button variant="outline" onClick={() => navigate('/clients')}>
          Back to clients
        </Button>
      }
    />
  )
}

export default ClientNotFound
