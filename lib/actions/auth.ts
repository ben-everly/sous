'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { ensureEmailIdentity } from '@/lib/services/auth'

// Never throws: the password is already set, so a failed backfill must not surface to the user.
// The acting user is resolved from the session (verified server-side), never from client input.
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
