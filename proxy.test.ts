import { describe, it, expect } from 'vitest'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { config } from './proxy'

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url })

describe('proxy matcher', () => {
  it.each(['/', '/dashboard', '/api/something', '/nested/deep/path'])('runs on %s', (url) => {
    expect(matches(url)).toBe(true)
  })

  it.each([
    '/_next/static/chunks/main.js',
    '/_next/image',
    '/favicon.ico',
    '/apple-touch-icon.ico',
    '/logo.svg',
    '/photo.png',
    '/photo.jpg',
    '/photo.jpeg',
    '/photo.gif',
    '/photo.webp',
    '/photo.avif',
    '/font.woff',
    '/font.woff2',
    '/font.ttf',
    '/font.otf',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.webmanifest',
  ])('skips %s', (url) => {
    expect(matches(url)).toBe(false)
  })
})
