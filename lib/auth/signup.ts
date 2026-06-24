import type { Session, User } from '@supabase/supabase-js'

// GoTrue returns a user with NO identities when the email is already registered — its
// non-enumerating obfuscation of a duplicate signup. This holds regardless of the
// confirmations setting, so callers must key off identities, not the null session.
export function isExistingAccountSignup(data: {
  user: User | null
  session: Session | null
}): boolean {
  return data.user?.identities?.length === 0
}
