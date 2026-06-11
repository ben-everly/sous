import { test as setup, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { adminClient } from './admin-client'
import { TEST_USER } from './test-user'

const authFile = 'e2e/.auth/user.json'

setup('authenticate', async ({ context, baseURL }) => {
  const admin = adminClient()

  // Idempotent: drop any user left over from a previous local run before
  // re-creating (CI starts from a fresh DB, so this is a no-op there).
  const { data: list } = await admin.auth.admin.listUsers()
  const stale = list.users.find((u) => u.email === TEST_USER.email)
  if (stale) await admin.auth.admin.deleteUser(stale.id)

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: TEST_USER.email,
    email_confirm: true,
    user_metadata: { full_name: TEST_USER.fullName, avatar_url: TEST_USER.avatarUrl },
  })
  if (createError || !created.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`)
  }

  // Assert the trigger bootstrapped the profile — surfaces a broken
  // handle_new_user as "seeded world missing" rather than a mystery redirect.
  const { data: profile } = await admin
    .from('profiles')
    .select('id, display_name')
    .eq('id', created.user.id)
    .maybeSingle()
  if (!profile) {
    throw new Error('Seeded profile is missing — the handle_new_user trigger may be broken')
  }

  // Email/password auth is off (Google-only app), so seed via the admin
  // generateLink → verifyOtp path instead of signInWithPassword.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_USER.email,
  })
  if (linkError || !link.properties?.hashed_token) {
    throw new Error(`Failed to generate seed link: ${linkError?.message}`)
  }
  const { data: signIn, error: signInError } = await createClient(
    url,
    publishableKey,
  ).auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'email' })
  if (signInError || !signIn.session) {
    throw new Error(`Failed to seed session: ${signInError?.message}`)
  }

  // Capture setSession's cookies via @supabase/ssr so the name/format stays
  // SDK-owned (drift-proof) instead of hand-rolled.
  const captured: { name: string; value: string }[] = []
  const cookieWriter = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => [],
      setAll: (cookies) => cookies.forEach(({ name, value }) => captured.push({ name, value })),
    },
  })
  await cookieWriter.auth.setSession({
    access_token: signIn.session.access_token,
    refresh_token: signIn.session.refresh_token,
  })

  await context.addCookies(captured.map((c) => ({ ...c, url: baseURL! })))

  const state = await context.storageState({ path: authFile })
  // Defend against @supabase/ssr cookie-format drift.
  expect(state.cookies.some((c) => /^sb-.*-auth-token/.test(c.name))).toBeTruthy()
})
