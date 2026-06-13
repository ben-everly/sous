'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const NAME_MAX = 200

// Shared by the rename editor and the create draft row — the only difference is what the
// parent's onSubmit does (UPDATE vs INSERT). Resolves true on success so the parent can
// unmount the form; false leaves it open (with the rejected value) to retry.
export function KitchenNameForm({
  initialValue,
  inputLabel,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValue: string
  inputLabel: string
  submitLabel: string
  onSubmit: (name: string) => Promise<boolean>
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue)
  const [pending, setPending] = useState(false)

  const submit = async () => {
    const name = value.trim()
    if (name === '' || pending) return
    setPending(true)
    // On success the parent unmounts this form; only re-enable if it rejected.
    if (!(await onSubmit(name))) setPending(false)
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
        autoFocus
        value={value}
        maxLength={NAME_MAX}
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
