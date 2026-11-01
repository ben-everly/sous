import { test, expect } from '@playwright/test'
import { adminClient } from './admin-client'
import { TEST_USER } from './test-user'

test.afterEach(async () => {
  const admin = adminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) throw error
  const user = data.users.find((u) => u.email === TEST_USER.email)!
  const { data: kitchens, error: kitchensError } = await admin
    .from('kitchens')
    .select('id')
    .eq('owner_id', user.id)
  if (kitchensError) throw kitchensError
  const { error: deleteError } = await admin
    .from('meal_plan_slots')
    .delete()
    .in(
      'kitchen_id',
      kitchens.map((k) => k.id),
    )
  if (deleteError) throw deleteError
})

test('plan: add a recipe to today, persist across reload, remove it', async ({ page }) => {
  const now = new Date()
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now)
  const where = `${weekday} dinner`
  const link = page.getByRole('link', { name: 'Ambrosia', exact: true })

  await page.clock.setFixedTime(now)
  await page.goto('/')
  await page.getByRole('link', { name: 'Plan', exact: true }).click()
  await page.getByRole('button', { name: `Add recipe to ${where}` }).click()
  await page.getByPlaceholder('Search recipes...').fill('ambros')
  await page.getByRole('option', { name: 'Ambrosia', exact: true }).click()
  await expect(link).toBeVisible()

  await page.reload()
  await expect(link).toBeVisible()

  await page.getByRole('button', { name: `Remove Ambrosia from ${where}`, exact: true }).click()
  await expect(link).toHaveCount(0)
  await expect(page.getByText(`Removed "Ambrosia" from ${where}`)).toBeVisible()
})
