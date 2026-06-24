import type { AuthError, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { OTP_TYPES, type OtpType } from './otp-types'

type VerifyResult = { ok: true } | { ok: false; error: AuthError | null }

// Allowlist derived from OTP_TYPES (the PUBLIC_PATHS pattern in routes.ts). Callers pass a
// literal member, so `type` is never attacker-controlled; the runtime guard is defense for
// any future dynamic caller and keeps the recovery-only invariant structural.
const ALLOWED_TYPES = new Set<string>(Object.values(OTP_TYPES))

export async function verifyEmailToken(
  supabase: SupabaseClient<Database>,
  { tokenHash, type }: { tokenHash: string; type: OtpType },
): Promise<VerifyResult> {
  if (!ALLOWED_TYPES.has(type)) return { ok: false, error: null }
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  return error ? { ok: false, error } : { ok: true }
}
