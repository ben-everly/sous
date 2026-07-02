'use client'

import * as React from 'react'
import { useFormContext } from 'react-hook-form'

import { cn } from '@/lib/utils'

// A second assertive region alongside the field-level FormMessage, so it carries its own data-slot.
function FormRootError({ className, ...props }: React.ComponentProps<'p'>) {
  const message = useFormContext().formState.errors.root?.message
  if (!message) return null

  return (
    <p
      data-slot="form-root-error"
      role="alert"
      className={cn('text-destructive text-center text-sm', className)}
      {...props}
    >
      {message}
    </p>
  )
}

export { FormRootError }
