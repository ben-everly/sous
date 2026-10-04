// @vitest-environment node
import { expect, it, vi } from 'vitest'

it('builds an absolute recipe URL on SITE_URL', async () => {
  vi.stubEnv('SUPABASE_SECRET_KEY', 'secret')
  vi.stubEnv('SITE_URL', 'https://app.example.com')
  const { recipeUrl } = await import('@/lib/recipes/urls')
  expect(recipeUrl('mango-salsa')).toBe('https://app.example.com/recipes/mango-salsa')
})
