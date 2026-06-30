'use client'

import { useCallback, useEffect, useState } from 'react'
import { markResendSent, resendCooldownRemainingMs } from '@/lib/auth/resend-cooldown'

// Live view of the resend cooldown for one address, derived from the persisted send time so it
// survives remounts and the "use a different email" round-trip instead of resetting per mount.
// A once-a-second `now` drives the recompute, so a switch between addresses stays current.
export function useResendCooldown(email: string) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const remainingMs = resendCooldownRemainingMs(email, now)

  const markSent = useCallback(() => {
    markResendSent(email)
    setNow(Date.now())
  }, [email])

  return { cooling: remainingMs > 0, secondsLeft: Math.ceil(remainingMs / 1000), markSent }
}
