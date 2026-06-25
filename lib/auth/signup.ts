import type { Session, User } from '@supabase/supabase-js'

export type SignupOutcome = 'existing' | 'authed' | 'awaiting_confirmation'

// The three outcomes of a signup attempt, named in one place so register-form reads a switch
// instead of an if-ladder over GoTrue's quirks.
export function classifySignupResult(data: {
  user: User | null
  session: Session | null
}): SignupOutcome {
  // GoTrue returns a user with NO identities when the email is already registered — its
  // non-enumerating obfuscation of a duplicate. This holds regardless of the confirmations
  // setting, so it must be checked off identities, not the null session, and before it.
  if (data.user?.identities?.length === 0) return 'existing'
  // Confirmations are on (config.toml enable_confirmations = true, pinned by a test), so a
  // genuine new signup is sessionless; a session here means an already-authenticated user.
  // Flipping confirmations off would route unconfirmed signups through this branch and log
  // them straight in — hence the test guarding that setting.
  if (data.session) return 'authed'
  return 'awaiting_confirmation'
}
