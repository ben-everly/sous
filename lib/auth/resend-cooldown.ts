// Client-side resend cooldown, keyed by email and persisted in localStorage so it spans tabs
// (a second tab can't re-enable the button and fire a send GoTrue would throttle) and survives
// the sent screen unmounting. This is UX only — GoTrue's max_frequency is the actual
// enforcement boundary.
export const COOLDOWN_MS = 60_000

// Normalize so casing/whitespace can't open a second window for the same address.
const storageKey = (email: string) => `resend-cooldown:${email.trim().toLowerCase()}`

export function markResendSent(email: string, now = Date.now()): void {
  try {
    localStorage.setItem(storageKey(email), String(now))
  } catch {
    // localStorage can be unavailable (private mode, storage disabled); the cooldown is a
    // nicety, so a failure to record it must not break the send.
  }
}

export function resendCooldownRemainingMs(email: string, now = Date.now()): number {
  try {
    const raw = localStorage.getItem(storageKey(email))
    if (raw === null) return 0
    const sentAt = Number(raw)
    if (Number.isNaN(sentAt)) return 0
    // Clamp to [0, COOLDOWN_MS]: a backwards clock skew (sentAt in the future) must not
    // report more than the full window.
    return Math.min(COOLDOWN_MS, Math.max(0, COOLDOWN_MS - (now - sentAt)))
  } catch {
    return 0
  }
}
