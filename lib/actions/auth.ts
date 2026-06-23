'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { ensureEmailIdentity } from '@/lib/services/auth'

// Best-effort cleanup after a password reset: backfill the email identity for first-password
// users (e.g. Google-only accounts — see ensureEmailIdentity). Never throws — the password is
// already set, so a failure here must not affect the user. The acting user is resolved from
// the session (verified server-side), never from client input.
export async function backfillEmailIdentity(): Promise<void> {
  try {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser()
    if (user) await ensureEmailIdentity(user, adminClient())
  } catch (error) {
    console.error('email identity backfill failed:', error instanceof Error ? error.message : error)
  }
}
