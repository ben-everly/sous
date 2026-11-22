import { test, expect } from './fixtures'

test.use({ isolatedUser: true })

test('plan: a full load renders server-prefetched kitchens without a browser fetch', async ({
  page,
}) => {
  const fetches: string[] = []
  const errors: string[] = []
  page.on('request', (r) => {
    if (r.method() === 'GET' && r.url().includes('/rest/v1/kitchens')) fetches.push(r.url())
  })
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  const html = await (await page.goto('/plan'))!.text()
  expect(html).not.toContain('Loading your kitchens')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This week')
  await page.waitForLoadState('networkidle')
  expect(fetches).toEqual([])
  expect(errors).toEqual([])
})

test('plan: a full load of ?week renders the server-prefetched week without a browser fetch', async ({
  page,
}) => {
  const start = '2026-10-11'
  const fetches: string[] = []
  const errors: string[] = []
  page.on('request', (r) => {
    if (
      r.method() === 'GET' &&
      r.url().includes('/rest/v1/meal_plan_slots') &&
      r.url().includes(`date=gte.${start}`)
    )
      fetches.push(r.url())
  })
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto(`/plan?week=${start}`)
  await expect(page.getByRole('button', { name: /^Add recipe to/ }).first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(fetches).toEqual([])
  expect(errors).toEqual([])
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

test('plan: navigate weeks with history, and open a misaligned week', async ({ page }) => {
  const now = new Date()
  const link = page.getByRole('link', { name: 'Ambrosia', exact: true })
  const heading = page.getByRole('heading', { level: 1 })

  await page.clock.setFixedTime(now)
  await page.goto('/')
  await page.getByRole('link', { name: 'Plan', exact: true }).click()
  await expect(heading).toHaveText('This week')

  await page.getByRole('button', { name: 'Next week' }).click()
  await expect(heading).toHaveText('Next week')
  await page
    .getByRole('button', { name: /^Add recipe to / })
    .first()
    .click()
  await page.getByPlaceholder('Search recipes...').fill('ambros')
  await page.getByRole('option', { name: 'Ambrosia', exact: true }).click()
  await expect(link).toBeVisible()

  await page.goBack()
  await expect(heading).toHaveText('This week')
  await expect(link).toHaveCount(0)
  await page.goForward()
  await expect(heading).toHaveText('Next week')
  await expect(link).toBeVisible()

  await page.reload()
  await expect(heading).toHaveText('Next week')
  await expect(link).toBeVisible()

  const wednesday = '2026-03-04'
  await page.goto(`/plan?week=${wednesday}`)
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(/Wednesday/)
})
