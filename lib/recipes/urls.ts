import { env } from '@/lib/env'

export const recipeUrl = (slug: string) => new URL(`/recipes/${slug}`, env.SITE_URL).href
