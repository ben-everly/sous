'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { OTP_TYPES } from '@/lib/auth/otp-types'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { Button } from '@/components/ui/button'

// Mirrors supabase/config.toml max_frequency = "60s". The cooldown is seeded from the last
// known send (signup, when seedCooldown is true) — not from first click — so the button is
// already disabled during the window GoTrue would reject, turning the limit into a designed
// pause rather than a surprise error.
export const COOLDOWN_MS = 60_000

export function ResendConfirmationButton({
  email,
  seedCooldown,
}: {
  email: string
  seedCooldown: boolean
}) {
  const [pending, setPending] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(seedCooldown ? COOLDOWN_MS / 1000 : 0)
  const [error, setError] = useState<string | null>(null)
  const cooling = secondsLeft > 0

  useEffect(() => {
    if (!cooling) return
    const timer = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooling])

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
    setSecondsLeft(COOLDOWN_MS / 1000)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onResend}
          disabled={pending || cooling}
          aria-busy={pending}
        >
          {pending && <LoaderCircle className="animate-spin" />}
          Resend confirmation email
        </Button>
        {/* aria-hidden: the disabled button already conveys "not yet"; a per-second
            live count would spam screen readers. */}
        {cooling && (
          <span aria-hidden className="text-muted-foreground text-xs tabular-nums">
            {secondsLeft}s
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
