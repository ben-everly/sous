import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// An OAuth user who sets a password via the recovery flow ends up with a working
// `encrypted_password` but no `email` identity row — GoTrue does not create one
// (verified against the local stack). Re-asserting the email through the admin API
// materializes that identity so `identities` reflects the password the user now has;
// without it the user can sign in but the OAuth provider can never be unlinked.
export async function ensureEmailIdentity(
  user: User,
  admin: SupabaseClient<Database>,
): Promise<boolean> {
  if (!user.email) return false
  if (user.identities?.some((identity) => identity.provider === 'email')) return false

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: user.email,
    email_confirm: true,
  })
  if (error) throw error
  return true
}
