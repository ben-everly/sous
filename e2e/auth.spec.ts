import { test, expect } from '@playwright/test'
import { TEST_USER } from './test-user'

test.describe('unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('redirects to /login and shows the Google sign-in button', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()
  })
})

test.describe('authenticated', () => {
  test('shows the dashboard and the profile in the header', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText(TEST_USER.fullName)).toBeVisible()
  })

  test('sign-out returns to /login and re-protects /', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
  })
})
