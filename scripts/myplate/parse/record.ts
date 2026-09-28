import { z } from 'zod'
import { directionsSchema, ingredientsSchema } from '../../../lib/recipes/types.ts'

export const recordSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  source_url: z.string().startsWith('https://'),
  name: z.string().trim().min(1),
  description: z.string().min(1).nullable(),
  ingredients: ingredientsSchema,
  directions: directionsSchema,
  yield: z.string().min(1).nullable(),
  nutrition: z.record(z.string(), z.unknown()).nullable(),
  notes: z.string().min(1).nullable(),
  contributor: z.string().min(1).nullable(),
})

export type Record = z.infer<typeof recordSchema>
