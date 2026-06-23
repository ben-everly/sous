import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { adminClient } from './admin-client'
import { makeGoogleOnly, identityProviders } from './db'
import { clearMailpit, waitForEmail, getRecoveryLink } from './mailpit'

test.use({ storageState: { cookies: [], origins: [] } })

const PASSWORD = 'sup3r-secret-pw'

async function deleteUser(email: string) {
  const admin = adminClient()
  const { data } = await admin.auth.admin.listUsers()
  const existing = data.users.find((u) => u.email === email)
  if (existing) await admin.auth.admin.deleteUser(existing.id)
}

test.describe('email/password auth', () => {
  test('sign-up signs the user in', async ({ page }) => {
    const email = `signup-${Date.now()}@example.com`
    await deleteUser(email)
    try {
      await page.goto('/register')
      await page.getByLabel('Email').fill(email)
      await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
      await page.getByLabel('Confirm password').fill(PASSWORD)
      await page.getByRole('button', { name: /create account/i }).click()
      await expect(page).toHaveURL(/\/$/)
    } finally {
      await deleteUser(email)
    }
  })

  // Pins GoTrue's confirmations-off behavior: a duplicate signup must surface the
  // non-enumerating copy and must NOT create a session. A CLI bump that changed this
  // (e.g. returning a live session for a duplicate) would fail here loudly.
  test('registering an existing email stays non-enumerating', async ({ page }) => {
    const email = `dupe-${Date.now()}@example.com`
    await deleteUser(email)
    await adminClient().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
    try {
      await page.goto('/register')
      await page.getByLabel('Email').fill(email)
      await page.getByLabel('Password', { exact: true }).fill('different-pw-123')
      await page.getByLabel('Confirm password').fill('different-pw-123')
      await page.getByRole('button', { name: /create account/i }).click()
      await expect(
        page.getByRole('alert').filter({ hasText: /already have an account/i }),
      ).toBeVisible()
      await expect(page).toHaveURL(/\/register$/)
    } finally {
      await deleteUser(email)
    }
  })

  test('sign-in: bad password rejected, good password lands home', async ({ page }) => {
    const email = `signin-${Date.now()}@example.com`
    await deleteUser(email)
    await adminClient().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
    try {
      await page.goto('/login')
      await page.getByLabel('Email').fill(email)
      await page.getByLabel('Password', { exact: true }).fill('wrong-password')
      await page.getByRole('button', { name: /^sign in$/i }).click()
      await expect(page.getByRole('alert').filter({ hasText: /incorrect/i })).toBeVisible()

      await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
      await page.getByRole('button', { name: /^sign in$/i }).click()
      await expect(page).toHaveURL(/\/$/)
    } finally {
      await deleteUser(email)
    }
  })

  test('password reset via Mailpit', async ({ page }) => {
    const email = `reset-${Date.now()}@example.com`
    await deleteUser(email)
    await adminClient().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
    await clearMailpit()
    try {
      await page.goto('/forgot-password')
      await page.getByLabel('Email').fill(email)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByRole('status')).toBeVisible()

      const messageId = await waitForEmail(email)
      await page.goto(await getRecoveryLink(messageId))
      await expect(page).toHaveURL(/\/reset-password/)

      const newPassword = 'br4nd-new-pw'
      await page.getByLabel('New password', { exact: true }).fill(newPassword)
      await page.getByLabel('Confirm password').fill(newPassword)
      await page.getByRole('button', { name: /update password/i }).click()
      await expect(page).toHaveURL(/\/$/)
    } finally {
      await deleteUser(email)
    }
  })

  // A Google-only user can set their first password via the recovery flow. GoTrue gives
  // them a working password but no email identity, so the reset form backfills it — this
  // pins both that the password works and that the identity is materialized.
  test('Google-only user sets a first password via reset and can sign in', async ({ page }) => {
    const email = `oauth-${Date.now()}@example.com`
    await deleteUser(email)
    const { data: created, error } = await adminClient().auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (error || !created.user) throw new Error(`seed failed: ${error?.message}`)
    makeGoogleOnly(created.user.id, email)
    expect(identityProviders(created.user.id)).toEqual(['google'])
    await clearMailpit()
    try {
      await page.goto('/forgot-password')
      await page.getByLabel('Email').fill(email)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByRole('status')).toBeVisible()

      const messageId = await waitForEmail(email)
      await page.goto(await getRecoveryLink(messageId))
      await expect(page).toHaveURL(/\/reset-password/)

      const password = 'first-password-123'
      await page.getByLabel('New password', { exact: true }).fill(password)
      await page.getByLabel('Confirm password').fill(password)
      await page.getByRole('button', { name: /update password/i }).click()
      await expect(page).toHaveURL(/\/$/)

      // The backfill action added the email identity alongside the existing google one.
      await expect.poll(() => identityProviders(created.user.id)).toEqual(['email', 'google'])

      // The newly set password works for email/password sign-in.
      const { data: signIn } = await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ).auth.signInWithPassword({ email, password })
      expect(signIn.session).not.toBeNull()
    } finally {
      await deleteUser(email)
    }
  })
})
