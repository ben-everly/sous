import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Sous - Home Kitchen Management/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
