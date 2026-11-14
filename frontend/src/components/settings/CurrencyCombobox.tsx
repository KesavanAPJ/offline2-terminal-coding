import { forwardRef, useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { COMMON_CURRENCIES, isCurrencyCode } from './settingsSchemas'

export interface CurrencyComboboxProps {
  id?: string
  value: string
  onChange: (code: string) => void
  onBlur?: () => void
  invalid?: boolean
  disabled?: boolean
  'aria-describedby'?: string
}

/** Pick a common ISO-4217 currency, or type any other 3-letter code. */
export const CurrencyCombobox = forwardRef<HTMLButtonElement, CurrencyComboboxProps>(function CurrencyCombobox(
  { id, value, onChange, onBlur, invalid, disabled, 'aria-describedby': describedBy },
  ref,
) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const current = value.toUpperCase()
  const selected = COMMON_CURRENCIES.find((c) => c.code === current)
  const typed = search.trim().toUpperCase()
  const canUseTyped = isCurrencyCode(typed) && !COMMON_CURRENCIES.some((c) => c.code === typed)

  const choose = (code: string): void => {
    onChange(code.toUpperCase())
    setSearch('')
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setSearch('')
          onBlur?.()
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {current ? (
              <>
                <span className="font-medium">{current}</span>
                {selected && <span className="text-muted-foreground"> — {selected.name}</span>}
              </>
            ) : (
              <span className="text-muted-foreground">Select currency</span>
            )}
          </span>
          <ChevronsUpDown className="opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search or type a code…" value={search} onValueChange={setSearch} maxLength={40} />
          <CommandList>
            <CommandEmpty>No match. Type a 3-letter ISO code, e.g. THB.</CommandEmpty>
            {canUseTyped && (
              <CommandGroup heading="Custom">
                <CommandItem value={`custom-${typed}`} onSelect={() => choose(typed)}>
                  <Plus aria-hidden="true" />
                  Use “{typed}”
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Common currencies">
              {COMMON_CURRENCIES.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} ${currency.name}`}
                  onSelect={() => choose(currency.code)}
                >
                  <Check className={cn(currency.code === current ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                  <span className="font-medium">{currency.code}</span>
                  <span className="text-muted-foreground">{currency.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

export default CurrencyCombobox
