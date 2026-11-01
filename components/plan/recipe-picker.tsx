'use client'

import { useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'
import { keepPreviousData } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { queryStatus } from '@/lib/data/query-status'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { searchRecipesQuery } from '@/lib/recipes/queries'
import { createClient } from '@/lib/supabase/client'

type Props = {
  disabled?: boolean
  planned?: string[]
  onPick: (recipeId: string) => void
  label: string
  className?: string
  children: ReactNode
}

export function RecipePicker({
  disabled,
  planned = [],
  onPick,
  label,
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label={label}
          className={className}
        >
          {children}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Search
          planned={planned}
          onPick={(id) => {
            onPick(id)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

// Mounted only while the popover is open, so closed pickers hold no query or debounce, and
// reopening starts from a blank search.
function Search({ planned, onPick }: { planned: string[]; onPick: (recipeId: string) => void }) {
  const [supabase] = useState(createClient)
  const [input, setInput] = useState('')
  const term = input.trim()
  const debounced = useDebouncedValue(term, 250)
  const query = useQuery(searchRecipesQuery(supabase, debounced), {
    enabled: debounced !== '',
    placeholderData: keepPreviousData,
    retry: 1,
  })
  const stale = term !== debounced || query.isPlaceholderData
  const status = term === '' ? 'idle' : stale ? 'stale' : queryStatus(query)
  const hits = status === 'idle' ? [] : (query.data ?? [])

  return (
    <Command shouldFilter={false}>
      <CommandInput placeholder="Search recipes..." value={input} onValueChange={setInput} />
      <CommandList>
        {status !== 'idle' && hits.length === 0 && (
          <CommandEmpty>
            {status === 'error' ? (
              <span role="alert">Couldn&apos;t search recipes.</span>
            ) : status === 'ready' ? (
              'No recipes found.'
            ) : (
              'Searching...'
            )}
          </CommandEmpty>
        )}
        {hits.map((hit) => {
          const added = planned.includes(hit.id)
          return (
            <CommandItem
              key={hit.id}
              value={hit.id}
              disabled={added || status === 'stale'}
              onSelect={() => onPick(hit.id)}
            >
              {hit.name}
              {added && (
                <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                  <Check />
                  Added
                </span>
              )}
            </CommandItem>
          )
        })}
      </CommandList>
    </Command>
  )
}
