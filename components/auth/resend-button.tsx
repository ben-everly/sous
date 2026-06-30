'use client'

import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { AuthError } from '@supabase/supabase-js'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { useResendCooldown } from '@/lib/hooks/use-resend-cooldown'
import { Button } from '@/components/ui/button'

export function ResendButton({
  email,
  resend,
  label,
  successMessage,
}: {
  email: string
  resend: () => Promise<{ error: AuthError | null }>
  label: string
  successMessage: string
}) {
  const { cooling, secondsLeft, markSent } = useResendCooldown(email)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onResend = async () => {
    setError(null)
    setPending(true)
    const { error } = await resend()
    setPending(false)
    if (error) {
      setError(authErrorMessage(error))
      return
    }
    toast.success(successMessage)
    markSent()
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        onClick={onResend}
        disabled={pending || cooling}
        aria-busy={pending}
      >
        {pending && <LoaderCircle className="animate-spin" />}
        {cooling ? `Resend available in ${secondsLeft}s` : label}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
