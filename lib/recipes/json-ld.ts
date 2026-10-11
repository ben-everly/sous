import type { HowToSection, HowToStep, Recipe, WithContext } from 'schema-dts'
import type { PublicRecipe } from '@/lib/recipes/queries'

const step = (text: string): HowToStep => ({ '@type': 'HowToStep', text })

export function recipeJsonLd(recipe: PublicRecipe, url: string): WithContext<Recipe> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    url,
    ...(recipe.description != null && { description: recipe.description }),
    ...(recipe.yield != null && { recipeYield: recipe.yield }),
    recipeIngredient: recipe.ingredients.flatMap((s) => s.items),
    recipeInstructions: recipe.directions.flatMap((s): (HowToStep | HowToSection)[] =>
      s.name == null
        ? s.steps.map(step)
        : [{ '@type': 'HowToSection', name: s.name, itemListElement: s.steps.map(step) }],
    ),
    ...(recipe.nutrition != null && { nutrition: recipe.nutrition }),
    ...(recipe.contributor != null && {
      author: {
        '@type': 'Organization',
        name: recipe.contributor.split(/\r?\n/).join(', '),
      },
    }),
  }
}

export const serializeJsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
