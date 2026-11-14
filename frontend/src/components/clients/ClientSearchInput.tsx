import { Loader2, Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface ClientSearchInputProps {
  value: string
  onChange: (value: string) => void
  /** Show a spinner while results load. */
  loading?: boolean
  className?: string
}

/** Search box with icon, clear button and loading indicator. */
export function ClientSearchInput({ value, onChange, loading = false, className }: ClientSearchInputProps) {
  return (
    <div className={cn('relative w-full sm:max-w-sm', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault()
            onChange('')
          }
        }}
        placeholder="Search by name, email or company"
        aria-label="Search clients"
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )
        )}
      </div>
    </div>
  )
}

export default ClientSearchInput
