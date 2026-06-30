'use client'

import { useCallback, useEffect, useState } from 'react'
import { markResendSent, resendCooldownRemainingMs } from '@/lib/auth/resend-cooldown'

// Live view of the resend cooldown for one address, derived from the persisted send time so it
// survives remounts and the "use a different email" round-trip instead of resetting per mount.
export function useResendCooldown(email: string) {
  const [now, setNow] = useState(() => Date.now())
  const remainingMs = resendCooldownRemainingMs(email, now)
  const cooling = remainingMs > 0

  // Tick only while counting down; an elapsed or absent cooldown has nothing to recompute.
  useEffect(() => {
    if (!cooling) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [cooling])

  const markSent = useCallback(() => {
    markResendSent(email)
    setNow(Date.now())
  }, [email])

  return { cooling, secondsLeft: Math.ceil(remainingMs / 1000), markSent }
}
