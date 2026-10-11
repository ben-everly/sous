import type { MetadataRoute } from 'next'
import { allRecipeSitemapEntries } from '@/lib/recipes/queries'
import { recipeUrl } from '@/lib/recipes/urls'
import { publicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return (await allRecipeSitemapEntries(publicClient)).map(({ slug, updated_at }) => ({
    url: recipeUrl(slug),
    lastModified: updated_at,
  }))
}
