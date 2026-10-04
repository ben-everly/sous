import { cache } from 'react'
import { publicClient } from '@/lib/supabase/public'
import { recipeBySlug } from '@/lib/recipes/queries'

export const getRecipe = cache((slug: string) => recipeBySlug(publicClient, slug))
