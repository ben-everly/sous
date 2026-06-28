'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { OTP_TYPES } from '@/lib/auth/otp-types'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { Button } from '@/components/ui/button'

// Mirrors supabase/config.toml max_frequency = "60s". The cooldown is seeded from the last
// known send (signup, when seedCooldown is true) — not from first click — so the button is
// already disabled during the window GoTrue would reject, turning the limit into a designed
// pause rather than a surprise error. Static text, no live ticking timer.
export const COOLDOWN_MS = 60_000

export function ResendConfirmationButton({
  email,
  seedCooldown,
}: {
  email: string
  seedCooldown: boolean
}) {
  const [pending, setPending] = useState(false)
  const [cooling, setCooling] = useState(seedCooldown)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!cooling) return
    const timer = setTimeout(() => setCooling(false), COOLDOWN_MS)
    return () => clearTimeout(timer)
  }, [cooling])

  const onResend = async () => {
    setMessage(null)
    setPending(true)
    const { error } = await createClient().auth.resend({
      type: OTP_TYPES.signup,
      email,
      options: { emailRedirectTo: `${window.location.origin}${AUTH_PATHS.confirm}` },
    })
    setPending(false)
    if (error) {
      setMessage(authErrorMessage(error))
      return
    }
    setMessage('Sent — check your inbox.')
    setCooling(true)
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="ghost"
        onClick={onResend}
        disabled={pending || cooling}
        aria-busy={pending}
        className="w-full"
      >
        {pending && <LoaderCircle className="animate-spin" />}
        Resend confirmation email
      </Button>
      {message ? (
        <p role="status" className="text-muted-foreground text-xs">
          {message}
        </p>
      ) : (
        cooling && (
          <p role="status" className="text-muted-foreground text-xs">
            You can resend in about a minute.
          </p>
        )
      )}
    </div>
  )
}
