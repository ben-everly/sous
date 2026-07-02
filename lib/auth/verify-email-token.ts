import type { AuthError, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { OtpType } from './otp-types'

type VerifyResult = { ok: true } | { ok: false; error: AuthError | null }

// Callers pass a literal OtpType, never the URL's `type` param — so verifyOtp's type is the one
// the type system already pins, and no runtime allowlist is needed. The two paths differ by
// design: confirm-email pins `signup` (ignoring the URL type); reset-password-form gates on the
// URL type being `recovery` before passing the `recovery` constant. That keeps a link redeemable
// only on its own path — a recovery token can't be spent as a signup, or vice versa.
export async function verifyEmailToken(
  supabase: SupabaseClient<Database>,
  { tokenHash, type }: { tokenHash: string; type: OtpType },
): Promise<VerifyResult> {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  return error ? { ok: false, error } : { ok: true }
}
