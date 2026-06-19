import { test, expect } from '@playwright/test'
import { TEST_USER } from './test-user'

// The bootstrapped kitchen is nameless, so it renders with the first-person fallback label.
const ownerKitchen = 'My Kitchen'

test.describe('kitchens', () => {
  test('soft delete: undo, restore from trash, and permanent delete', async ({ page }) => {
    await page.goto('/')

    await page.getByText(TEST_USER.fullName).click()
    await page.getByRole('menuitem', { name: /settings/i }).click()
    await expect(page).toHaveURL(/\/settings\/kitchens$/)
    await expect(page.getByText(ownerKitchen)).toBeVisible()

    // Create and rename a kitchen (unchanged flow).
    await page.getByRole('button', { name: 'Add kitchen' }).click()
    await page.getByLabel('New kitchen name').fill('Beach House')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('Beach House')).toBeVisible()

    await page.getByRole('button', { name: 'Rename Beach House' }).click()
    await page.getByLabel('Kitchen name', { exact: true }).fill('Lake House')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Lake House')).toBeVisible()

    // Delete is frictionless (no confirm) → row leaves the live list + an Undo toast appears.
    await page.getByRole('button', { name: 'Delete Lake House' }).click()
    await expect(page.getByText('Lake House')).toHaveCount(0)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Lake House')).toBeVisible()

    // Delete again, then restore from the Recently deleted trash.
    await page.getByRole('button', { name: 'Delete Lake House' }).click()
    await expect(page.getByText('Lake House')).toHaveCount(0)
    await page.getByRole('button', { name: 'Recently deleted' }).click()
    await page.getByRole('button', { name: 'Restore Lake House' }).click()
    await expect(page.getByText('Lake House')).toBeVisible()

    // Delete again, then permanently delete from the trash (this one is gone for good).
    await page.getByRole('button', { name: 'Delete Lake House' }).click()
    // Guard: the trash section may still be open from the previous restore — only click to open it.
    const restoreBtn = page.getByRole('button', { name: 'Restore Lake House' })
    if (!(await restoreBtn.isVisible())) {
      await page.getByRole('button', { name: 'Recently deleted' }).click()
    }
    await page.getByRole('button', { name: 'Delete Lake House permanently' }).click()
    await page.getByRole('button', { name: 'Delete permanently' }).click()
    await expect(page.getByRole('button', { name: 'Restore Lake House' })).toHaveCount(0)
  })
})
