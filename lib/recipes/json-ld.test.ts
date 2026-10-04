import { describe, expect, it } from 'vitest'
import { recipeJsonLd, serializeJsonLd } from '@/lib/recipes/json-ld'
import type { PublicRecipe } from '@/lib/recipes/queries'

const URL = 'https://sous.test/recipes/soup'
const base: PublicRecipe = {
  slug: 'soup',
  name: 'Soup',
  description: 'Warm',
  ingredients: [
    { name: null, items: ['1 onion', '2 cups water'] },
    { name: 'Garnish', items: ['parsley'] },
  ],
  directions: [{ name: null, steps: ['Chop', 'Boil'] }],
  yield: '4 servings',
  nutrition: { '@type': 'NutritionInformation', calories: '100 calories' },
  notes: null,
  contributor: 'Food Hero',
}

describe('recipeJsonLd', () => {
  it('builds core fields and flattens ingredient sections', () => {
    expect(recipeJsonLd(base, URL)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Soup',
      url: URL,
      description: 'Warm',
      recipeYield: '4 servings',
      recipeIngredient: ['1 onion', '2 cups water', 'parsley'],
      nutrition: base.nutrition,
      author: { '@type': 'Organization', name: 'Food Hero' },
    })
  })

  it('inlines unnamed instruction steps', () => {
    expect(recipeJsonLd(base, URL).recipeInstructions).toEqual([
      { '@type': 'HowToStep', text: 'Chop' },
      { '@type': 'HowToStep', text: 'Boil' },
    ])
  })

  it('wraps named sections and keeps order in a mix', () => {
    const r = {
      ...base,
      directions: [
        { name: null, steps: ['Prep'] },
        { name: 'Cook', steps: ['Heat', 'Stir'] },
        { name: null, steps: ['Serve'] },
      ],
    } as PublicRecipe
    expect(recipeJsonLd(r, URL).recipeInstructions).toEqual([
      { '@type': 'HowToStep', text: 'Prep' },
      {
        '@type': 'HowToSection',
        name: 'Cook',
        itemListElement: [
          { '@type': 'HowToStep', text: 'Heat' },
          { '@type': 'HowToStep', text: 'Stir' },
        ],
      },
      { '@type': 'HowToStep', text: 'Serve' },
    ])
  })

  it('omits null description, yield, nutrition, and contributor; no image or times', () => {
    const ld = recipeJsonLd(
      { ...base, description: null, yield: null, nutrition: null, contributor: null },
      URL,
    )
    expect(ld).not.toHaveProperty('description')
    expect(ld).not.toHaveProperty('recipeYield')
    expect(ld).not.toHaveProperty('nutrition')
    expect(ld).not.toHaveProperty('author')
    expect(ld).not.toHaveProperty('image')
  })

  it('joins multi-line contributor with a comma', () => {
    const ld = recipeJsonLd({ ...base, contributor: 'Adapted from: Food Hero\nOSU Extension' }, URL)
    expect(ld.author).toEqual({
      '@type': 'Organization',
      name: 'Adapted from: Food Hero, OSU Extension',
    })
  })
})

describe('serializeJsonLd', () => {
  it('escapes <, > and & while round-tripping', () => {
    const value = { name: '</script><script>alert(1)</script> & co' }
    const out = serializeJsonLd(value)
    expect(out).not.toMatch(/[<>&]/)
    expect(JSON.parse(out)).toEqual(value)
  })
})
