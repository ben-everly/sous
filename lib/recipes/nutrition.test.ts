import { describe, it, expect } from 'vitest'
import { nutritionFacts } from './nutrition'

describe('nutritionFacts', () => {
  it('returns empty rows and null serving size for null input', () => {
    const result = nutritionFacts(null)
    expect(result).toEqual({ servingSize: null, rows: [] })
  })

  it('extracts calories-only nutrition object', () => {
    const result = nutritionFacts({
      '@type': 'NutritionInformation',
      calories: '200',
    })
    expect(result).toEqual({
      servingSize: null,
      rows: [{ label: 'Calories', value: '200' }],
    })
  })

  it('extracts full nutrition object with all known keys', () => {
    const result = nutritionFacts({
      '@type': 'NutritionInformation',
      servingSize: '1 cup',
      calories: '150',
      fatContent: '5g',
      saturatedFatContent: '1g',
      cholesterolContent: '20mg',
      sodiumContent: '500mg',
      carbohydrateContent: '20g',
      fiberContent: '3g',
      sugarContent: '5g',
      proteinContent: '8g',
    })
    expect(result).toEqual({
      servingSize: '1 cup',
      rows: [
        { label: 'Calories', value: '150' },
        { label: 'Total fat', value: '5g' },
        { label: 'Saturated fat', value: '1g' },
        { label: 'Cholesterol', value: '20mg' },
        { label: 'Sodium', value: '500mg' },
        { label: 'Carbohydrates', value: '20g' },
        { label: 'Fiber', value: '3g' },
        { label: 'Sugars', value: '5g' },
        { label: 'Protein', value: '8g' },
      ],
    })
  })

  it('ignores unknown keys and @type', () => {
    const result = nutritionFacts({
      '@type': 'NutritionInformation',
      calories: '200',
      unknownKey: 'ignored',
      anotherUnknown: 'also ignored',
    })
    expect(result).toEqual({
      servingSize: null,
      rows: [{ label: 'Calories', value: '200' }],
    })
  })

  it('joins a multi-value serving size', () => {
    expect(
      nutritionFacts({ '@type': 'NutritionInformation', servingSize: ['1/6 of recipe', '1 cup'] })
        .servingSize,
    ).toBe('1/6 of recipe / 1 cup')
  })

  it('skips keys with empty string values', () => {
    const result = nutritionFacts({
      '@type': 'NutritionInformation',
      calories: '200',
      fatContent: '',
      saturatedFatContent: '1g',
    })
    expect(result).toEqual({
      servingSize: null,
      rows: [
        { label: 'Calories', value: '200' },
        { label: 'Saturated fat', value: '1g' },
      ],
    })
  })

  it('maintains correct order even when keys are not sequential', () => {
    const result = nutritionFacts({
      '@type': 'NutritionInformation',
      proteinContent: '10g',
      calories: '150',
      fiberContent: '3g',
      fatContent: '5g',
    })
    expect(result).toEqual({
      servingSize: null,
      rows: [
        { label: 'Calories', value: '150' },
        { label: 'Total fat', value: '5g' },
        { label: 'Fiber', value: '3g' },
        { label: 'Protein', value: '10g' },
      ],
    })
  })
})
