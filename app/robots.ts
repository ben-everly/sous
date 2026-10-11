import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/recipes', '/_next/', '/opengraph-image', '/twitter-image'],
      disallow: '/',
    },
    sitemap: new URL('/sitemap.xml', env.SITE_URL).href,
  }
}
