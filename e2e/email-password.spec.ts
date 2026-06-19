import { test, expect } from '@playwright/test'
import { adminClient } from './admin-client'
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
})
