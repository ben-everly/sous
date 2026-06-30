'use client'

import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { OTP_TYPES } from '@/lib/auth/otp-types'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { useResendCooldown } from '@/lib/hooks/use-resend-cooldown'
import { Button } from '@/components/ui/button'

export function ResendConfirmationButton({ email }: { email: string }) {
  const { cooling, secondsLeft, markSent } = useResendCooldown(email)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onResend = async () => {
    setError(null)
    setPending(true)
    const { error } = await createClient().auth.resend({
      type: OTP_TYPES.signup,
      email,
      options: { emailRedirectTo: `${window.location.origin}${AUTH_PATHS.confirm}` },
    })
    setPending(false)
    if (error) {
      setError(authErrorMessage(error))
      return
    }
    toast.success('Confirmation email sent.')
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
        {cooling ? `Resend available in ${secondsLeft}s` : 'Resend confirmation email'}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
