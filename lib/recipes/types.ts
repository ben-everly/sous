import { z } from 'zod'

// z.tuple with a rest element, rather than z.array().min(1): only the tuple form infers
// [T, ...T[]], which is what mirrors the database's `cardinality > 0`.
const nonEmptyStrings = z.tuple([z.string()], z.string())

export const ingredientSectionSchema = z.object({
  name: z.string().nullable(),
  items: nonEmptyStrings,
})

export const ingredientsSchema = z.tuple([ingredientSectionSchema], ingredientSectionSchema)

export const directionSectionSchema = z.object({
  name: z.string().nullable(),
  steps: nonEmptyStrings,
})

export const directionsSchema = z.tuple([directionSectionSchema], directionSectionSchema)

export const nutritionSchema = z
  .object({ '@type': z.literal('NutritionInformation') })
  .catchall(z.union([z.string(), nonEmptyStrings]))

export type IngredientSection = z.infer<typeof ingredientSectionSchema>
export type Ingredients = z.infer<typeof ingredientsSchema>
export type DirectionSection = z.infer<typeof directionSectionSchema>
export type Directions = z.infer<typeof directionsSchema>
export type Nutrition = z.infer<typeof nutritionSchema>
