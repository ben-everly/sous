import type { Nutrition } from '@/lib/recipes/types'

const NUTRITION_LABELS = {
  calories: 'Calories',
  fatContent: 'Total fat',
  saturatedFatContent: 'Saturated fat',
  cholesterolContent: 'Cholesterol',
  sodiumContent: 'Sodium',
  carbohydrateContent: 'Carbohydrates',
  fiberContent: 'Fiber',
  sugarContent: 'Sugars',
  proteinContent: 'Protein',
}

export function nutritionFacts(nutrition: Nutrition | null): {
  servingSize: string | null
  rows: { label: string; value: string }[]
} {
  const text = (key: string) => {
    const value = nutrition?.[key]
    return !value ? null : typeof value === 'string' ? value : value.join(' / ')
  }

  const rows = Object.entries(NUTRITION_LABELS)
    .map(([key, label]) => {
      const value = text(key)
      return value ? { label, value } : null
    })
    .filter((r) => r !== null)

  return { servingSize: text('servingSize'), rows }
}
