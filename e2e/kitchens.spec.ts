import { test, expect } from '@playwright/test'
import { TEST_USER } from './test-user'

// The bootstrapped kitchen is nameless, so it renders with the first-person fallback label.
const ownerKitchen = 'My Kitchen'

test.describe('kitchens', () => {
  test('manage kitchens from settings', async ({ page }) => {
    await page.goto('/')

    // Reach the kitchens page via the avatar dropdown.
    await page.getByText(TEST_USER.fullName).click()
    await page.getByRole('menuitem', { name: /settings/i }).click()
    await expect(page).toHaveURL(/\/settings\/kitchens$/)
    await expect(page.getByText(ownerKitchen)).toBeVisible()

    // Create a named kitchen via a draft row.
    await page.getByRole('button', { name: 'Add kitchen' }).click()
    await page.getByLabel('New kitchen name').fill('Beach House')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('Beach House')).toBeVisible()

    // Rename it.
    await page.getByRole('button', { name: 'Rename Beach House' }).click()
    await page.getByLabel('Kitchen name', { exact: true }).fill('Lake House')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Lake House')).toBeVisible()
    await expect(page.getByText('Beach House')).toHaveCount(0)

    // Delete it.
    await page.getByRole('button', { name: 'Delete Lake House' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByText('Lake House')).toHaveCount(0)

    // Delete the last (bootstrapped) kitchen → empty state.
    await page.getByRole('button', { name: `Delete ${ownerKitchen}` }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByText(/you have no kitchens yet/i)).toBeVisible()

    // Re-create from empty → leave the name blank to get the default kitchen back.
    await page.getByRole('button', { name: 'Add kitchen' }).click()
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText(ownerKitchen)).toBeVisible()
  })
})
