import { test as base, expect } from './fixtures'
import type { Database } from '@/types/database.types'
import { adminClient } from './admin-client'

const name = 'E2E Fixture Soup </script><script>window.__pwned=1</script>'
const fixture = {
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
} satisfies Omit<Database['public']['Tables']['recipes']['Insert'], 'slug'>

// Next may stream metadata into <body> for other user agents; known bots get it blocking in <head>.
const googlebot = {
  'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
}

const test = base.extend<{ recipe: typeof fixture & { slug: string; path: string } }>({
  recipe: async ({}, provide) => {
    const slug = `zz-e2e-${crypto.randomUUID().slice(0, 8)}`
    const { error } = await adminClient()
      .from('recipes')
      .insert({ ...fixture, slug })
    if (error) throw error
    await provide({ ...fixture, slug, path: `/recipes/${slug}` })
    const { error: deleteError } = await adminClient().from('recipes').delete().eq('slug', slug)
    if (deleteError) throw deleteError
  },
})

test.describe('public recipe page, logged out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('renders every recipe field in the HTML', async ({ request, recipe }) => {
    const res = await request.get(recipe.path)
    expect(res.status()).toBe(200)
    const html = await res.text()
    for (const text of [
      'E2E Fixture Soup',
      recipe.description,
      ...recipe.ingredients[0].items,
      recipe.directions[0].name,
      recipe.directions[0].steps[0],
      recipe.directions[1].steps[0],
      recipe.yield,
      ...recipe.contributor.split('\n'),
      recipe.nutrition.calories,
      recipe.nutrition.servingSize,
      recipe.nutrition.proteinContent,
      recipe.notes,
    ]) {
      expect(html).toContain(text)
    }
  })

  test('serves an absolute canonical URL and social images in <head> to bots', async ({
    request,
    recipe,
  }) => {
    const html = await (await request.get(recipe.path, { headers: googlebot })).text()
    const head = html.slice(0, html.indexOf('</head>'))
    const canonical = head.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
    expect(canonical).toBeDefined()
    expect(new URL(canonical!).pathname).toBe(recipe.path)
    expect(head).toMatch(/<meta property="og:image" content="https?:\/\/[^"]+"/)
    expect(head).toMatch(/<meta name="twitter:image" content="https?:\/\/[^"]+"/)
  })

  test('embeds parseable Recipe JSON-LD without breaking out of the script tag', async ({
    request,
    recipe,
  }) => {
    const html = await (await request.get(recipe.path)).text()
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1]
    expect(json).toBeDefined()
    const ld = JSON.parse(json!)
    expect(ld['@type']).toBe('Recipe')
    expect(ld.name).toBe(recipe.name)
    expect(html).not.toContain('</script><script>window.__pwned')
  })

  test('returns 404 for an unknown slug', async ({ request }) => {
    expect((await request.get('/recipes/zz-e2e-does-not-exist')).status()).toBe(404)
  })

  test('lists the recipe in the sitemap with a lastmod', async ({ request, recipe }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    expect(xml).toMatch(new RegExp(`<loc>[^<]*${recipe.path}</loc>\\s*<lastmod>[^<]+</lastmod>`))
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

  test('does not execute markup injected through the recipe name', async ({ page, recipe }) => {
    await page.goto(recipe.path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(recipe.name)
    expect(await page.evaluate(() => (window as { __pwned?: unknown }).__pwned)).toBeUndefined()
  })
})

test.describe('public recipe page, logged in', () => {
  test('renders without redirecting', async ({ page, recipe }) => {
    await page.goto(recipe.path)
    await expect(page).toHaveURL(new RegExp(`${recipe.path}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(recipe.name)
  })
})
