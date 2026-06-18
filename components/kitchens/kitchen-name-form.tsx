'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const NAME_MAX = 200

export function KitchenNameForm({
  initialValue,
  inputLabel,
  submitLabel,
  placeholder,
  onSubmit,
  onCancel,
}: {
  initialValue: string
  inputLabel: string
  submitLabel: string
  placeholder?: string
  onSubmit: (name: string) => Promise<boolean>
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue)
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const name = value.trim()
    if (name === '' || pending) return
    setPending(true)
    onSubmit(name)
      .then((ok) => ok || inputRef.current?.focus())
      .finally(() => setPending(false))
  }

  return (
    <form
      className="flex flex-1 items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Input
        ref={inputRef}
        autoFocus
        value={value}
        maxLength={NAME_MAX}
        placeholder={placeholder}
        aria-label={inputLabel}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      />
      <Button type="submit" size="sm" disabled={value.trim() === '' || pending} aria-busy={pending}>
        {submitLabel}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  )
}
