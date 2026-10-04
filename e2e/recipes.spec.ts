import { test, expect } from '@playwright/test'
import type { Database } from '@/types/database.types'
import { adminClient } from './admin-client'

const slug = 'zz-e2e-recipe-page'
const path = `/recipes/${slug}`
const name = 'E2E Fixture Soup </script><script>window.__pwned=1</script>'
const fixture = {
  slug,
  name,
  description: 'A fixture recipe for end to end tests.',
  ingredients: [{ name: null, items: ['2 cups fixture broth', '1 fixture carrot'] }],
  directions: [
    { name: 'Prep the fixture', steps: ['Dice the fixture carrot.'] },
    { name: null, steps: ['Simmer the fixture broth for 10 minutes.'] },
  ],
  yield: '4 fixture servings',
  nutrition: {
    '@type': 'NutritionInformation',
    calories: '123 kcal',
    servingSize: '1 fixture cup',
    proteinContent: '7 g',
  },
  notes: 'Fixture notes go here.',
  contributor: 'Fixture contributor line one\nFixture contributor line two',
} satisfies Database['public']['Tables']['recipes']['Insert']

// Next may stream metadata into <body> for other user agents; known bots get it blocking in <head>.
const googlebot = {
  'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
}

// The fixture is shared across the file, so keep its tests in one worker.
test.describe.configure({ mode: 'default' })

test.beforeAll(async () => {
  const { error } = await adminClient().from('recipes').upsert(fixture, { onConflict: 'slug' })
  if (error) throw error
})

test.afterAll(async () => {
  const { error } = await adminClient().from('recipes').delete().eq('slug', slug)
  if (error) throw error
})

test.describe('public recipe page, logged out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('renders every recipe field in the HTML', async ({ request }) => {
    const res = await request.get(path)
    expect(res.status()).toBe(200)
    const html = await res.text()
    for (const text of [
      'E2E Fixture Soup',
      fixture.description,
      ...fixture.ingredients[0].items,
      fixture.directions[0].name,
      fixture.directions[0].steps[0],
      fixture.directions[1].steps[0],
      fixture.yield,
      ...fixture.contributor.split('\n'),
      fixture.nutrition.calories,
      fixture.nutrition.servingSize,
      fixture.nutrition.proteinContent,
      fixture.notes,
    ]) {
      expect(html).toContain(text)
    }
  })

  test('serves an absolute canonical URL and social images in <head> to bots', async ({
    request,
  }) => {
    const html = await (await request.get(path, { headers: googlebot })).text()
    const head = html.slice(0, html.indexOf('</head>'))
    const canonical = head.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
    expect(canonical).toBeDefined()
    expect(new URL(canonical!).pathname).toBe(path)
    expect(head).toMatch(/<meta property="og:image" content="https?:\/\/[^"]+"/)
    expect(head).toMatch(/<meta name="twitter:image" content="https?:\/\/[^"]+"/)
  })

  test('embeds parseable Recipe JSON-LD without breaking out of the script tag', async ({
    request,
  }) => {
    const html = await (await request.get(path)).text()
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1]
    expect(json).toBeDefined()
    const ld = JSON.parse(json!)
    expect(ld['@type']).toBe('Recipe')
    expect(ld.name).toBe(name)
    expect(html).not.toContain('</script><script>window.__pwned')
  })

  test('returns 404 for an unknown slug', async ({ request }) => {
    expect((await request.get('/recipes/zz-e2e-does-not-exist')).status()).toBe(404)
  })

  test('lists the recipe in the sitemap with a lastmod', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    expect(xml).toMatch(new RegExp(`<loc>[^<]*${path}</loc>\\s*<lastmod>[^<]+</lastmod>`))
  })

  test('robots.txt allows recipes, disallows the rest, and points at the sitemap', async ({
    request,
  }) => {
    const robots = await (await request.get('/robots.txt')).text()
    for (const allow of ['/recipes', '/_next/', '/opengraph-image', '/twitter-image']) {
      expect(robots).toContain(`Allow: ${allow}\n`)
    }
    expect(robots).toContain('Disallow: /\n')
    expect(robots).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/)
  })

  test('does not execute markup injected through the recipe name', async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    expect(await page.evaluate(() => (window as { __pwned?: unknown }).__pwned)).toBeUndefined()
  })
})

test.describe('public recipe page, logged in', () => {
  test('renders without redirecting', async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
  })
})
