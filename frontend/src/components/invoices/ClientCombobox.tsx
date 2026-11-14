import { forwardRef, useEffect, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Loader2, Plus, UserRound } from 'lucide-react'

import { QuickAddClientDialog } from '@/components/clients/QuickAddClientDialog'
import { Button } from '@/components/ui/button'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { clientKeys, listClients } from '@/services/clientService'
import type { Client, ClientSummary } from '@/types'

export interface ClientComboboxProps {
  value: ClientSummary | null
  /** Called when the user picks (or quick-adds) a client. */
  onChange: (client: ClientSummary) => void
  /** Fired after selection settles, so the caller can move focus (e.g. to the first line item). */
  onSelected?: (source: 'list' | 'created') => void
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
  id?: string
  className?: string
}

const SEARCH_DEBOUNCE_MS = 250

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(handle)
  }, [value, delay])
  return debounced
}

function toSummary(client: Client): ClientSummary {
  return { id: client.id, name: client.name, email: client.email, company: client.company }
}

/** Type-ahead client picker with an inline "+ Add “name”" quick-create option. */
export const ClientCombobox = forwardRef<HTMLButtonElement, ClientComboboxProps>(function ClientCombobox(
  { value, onChange, onSelected, invalid = false, disabled = false, autoFocus = false, id, className },
  ref,
) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  const suppressFocusReturn = useRef(false)

  const debouncedQuery = useDebounced(query.trim(), SEARCH_DEBOUNCE_MS)
  const params = { q: debouncedQuery || undefined, size: 10 }
  const { data, isFetching, isError } = useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => listClients(params),
    enabled: open,
    placeholderData: keepPreviousData,
  })
  const clients = data?.items ?? []
  const trimmed = query.trim()
  const stale = trimmed !== debouncedQuery

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setQuery('')
  }

  const pick = (client: ClientSummary) => {
    suppressFocusReturn.current = true
    onChange(client)
    handleOpenChange(false)
    onSelected?.('list')
  }

  const startQuickAdd = () => {
    setQuickAddName(trimmed)
    suppressFocusReturn.current = true
    handleOpenChange(false)
    setQuickAddOpen(true)
  }

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            autoFocus={autoFocus}
            className={cn('h-10 w-full justify-between px-3 font-normal', !value && 'text-muted-foreground', className)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <UserRound className="size-4 shrink-0 opacity-60" aria-hidden="true" />
              {value ? (
                <span className="truncate text-foreground">
                  {value.name}
                  {value.company && <span className="text-muted-foreground"> · {value.company}</span>}
                </span>
              ) : (
                <span className="truncate">Search or add a client…</span>
              )}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-72 p-0"
          onCloseAutoFocus={(event) => {
            if (suppressFocusReturn.current) {
              event.preventDefault()
              suppressFocusReturn.current = false
            }
          }}
        >
          <Command shouldFilter={false}>
            <CommandInput placeholder="Type a client name…" value={query} onValueChange={setQuery} />
            <CommandList>
              {isFetching && clients.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Searching…
                </div>
              ) : (
                clients.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {isError ? 'Could not load clients.' : trimmed ? 'No matching clients.' : 'No clients yet.'}
                  </p>
                )
              )}
              {clients.length > 0 && (
                <CommandGroup heading={stale || isFetching ? 'Clients (updating…)' : 'Clients'}>
                  {clients.map((client) => (
                    <CommandItem key={client.id} value={`client-${client.id}`} onSelect={() => pick(toSummary(client))}>
                      <Check
                        className={cn('size-4', value?.id === client.id ? 'opacity-100' : 'opacity-0')}
                        aria-hidden="true"
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{client.name}</span>
                        {(client.company || client.email) && (
                          <span className="truncate text-xs text-muted-foreground">
                            {[client.company, client.email].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup forceMount>
                <CommandItem value="__quick-add__" onSelect={startQuickAdd} forceMount>
                  <Plus className="size-4" aria-hidden="true" />
                  {trimmed ? (
                    <span className="truncate">
                      Add “<span className="font-medium">{trimmed}</span>”
                    </span>
                  ) : (
                    <span>New client</span>
                  )}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickAddClientDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        initialName={quickAddName}
        onCreated={(client) => {
          onChange(toSummary(client))
          setQuickAddOpen(false)
          onSelected?.('created')
        }}
      />
    </>
  )
})
