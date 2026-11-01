import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Slot } from '@/lib/plan/queries'

vi.mock('./recipe-picker', () => ({
  RecipePicker: ({
    disabled,
    label,
    onPick,
    children,
  }: {
    disabled?: boolean
    label: string
    onPick: (recipeId: string) => void
    children?: React.ReactNode
  }) => (
    <button disabled={disabled} aria-label={label} onClick={() => onPick('r9')}>
      {children}
    </button>
  ),
}))

import { MealCell } from './meal-cell'

const slot = (i: number): Slot => ({
  id: `s${i}`,
  kitchen_id: 'k',
  date: '2026-10-18',
  meal_type: 'dinner',
  recipe_id: `r${i}`,
  created_at: '2026-10-01T00:00:00Z',
  recipes: { id: `r${i}`, slug: `pie-${i}`, name: `Pie ${i}` },
})

const setup = (slots: Slot[] = [], over = {}) => {
  const props = {
    date: '2026-10-18',
    mealType: 'dinner' as const,
    slots,
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    ...over,
  }
  render(<MealCell {...props} />)
  return props
}

afterEach(cleanup)

describe('MealCell', () => {
  it('shows an add button when empty and adds the picked recipe', () => {
    const p = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Add recipe to Sunday dinner' }))
    expect(p.onAdd).toHaveBeenCalledWith('r9')
  })

  it('links slots to the recipe page', () => {
    setup([slot(1)])
    expect(screen.getByRole('link', { name: 'Pie 1' }).getAttribute('href')).toBe('/recipes/pie-1')
  })

  it('removes without confirmation', () => {
    const p = setup([slot(1)])
    fireEvent.click(screen.getByRole('button', { name: 'Remove Pie 1 from Sunday dinner' }))
    expect(p.onRemove).toHaveBeenCalledWith(slot(1))
  })

  it('keeps add enabled at 19 slots', () => {
    setup(Array.from({ length: 19 }, (_, i) => slot(i)))
    expect(
      screen.getByRole('button', { name: 'Add recipe to Sunday dinner' }).hasAttribute('disabled'),
    ).toBe(false)
    expect(screen.queryByText('Full (20 max)')).toBeNull()
  })

  it('disables add and shows the hint at 20 slots', () => {
    setup(Array.from({ length: 20 }, (_, i) => slot(i)))
    expect(
      screen.getByRole('button', { name: 'Add recipe to Sunday dinner' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(screen.getByText('Full (20 max)')).toBeTruthy()
  })
})
