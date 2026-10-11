import { AsyncLocalStorage } from 'node:async_hooks'
import { beforeAll, describe, expect, it } from 'vitest'
import { config } from '@/proxy'

let matches: (url: string) => boolean

beforeAll(async () => {
  // Next's testing entry reads AsyncLocalStorage off globalThis at import, which only its own
  // runtime sets up.
  Object.assign(globalThis, { AsyncLocalStorage })
  const { unstable_doesMiddlewareMatch } = await import('next/experimental/testing/server')
  matches = (url) => unstable_doesMiddlewareMatch({ config, url })
})

describe('proxy matcher', () => {
  it.each([
    '/settings/kitchens',
    '/recipes/soup',
    '/settings/opengraph-image-foo',
    '/recipes/twitter-image-cake',
  ])('runs on %s', (url) => {
    expect(matches(url)).toBe(true)
  })

  it.each([
    '/opengraph-image',
    '/twitter-image',
    '/recipes/soup/opengraph-image',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ])('skips %s', (url) => {
    expect(matches(url)).toBe(false)
  })
})
