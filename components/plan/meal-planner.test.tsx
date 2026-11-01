import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Slot } from '@/lib/plan/queries'

const mocks = vi.hoisted(() => ({ kitchens: vi.fn(), plan: vi.fn() }))

vi.mock('@/components/kitchens/use-kitchens', () => ({ useKitchens: mocks.kitchens }))
vi.mock('./use-meal-plan', () => ({ useMealPlan: mocks.plan }))
vi.mock('./recipe-picker', () => ({
  RecipePicker: ({
    disabled,
    label,
    children,
  }: {
    disabled?: boolean
    label: string
    children?: React.ReactNode
  }) => (
    <button disabled={disabled} aria-label={label}>
      {children}
    </button>
  ),
}))

import { CurrentKitchenPlanner, MealPlanner } from './meal-planner'

const kitchen = { id: 'k1', name: 'Home', created_at: '2026-01-01T00:00:00Z', deleted_at: null }

const plan = (over = {}) =>
  mocks.plan.mockReturnValue({
    status: 'ready',
    retry: vi.fn(),
    slotsFor: () => [] as Slot[],
    add: vi.fn(),
    remove: vi.fn(),
    ...over,
  })

const slot = (i: number): Slot => ({
  id: `s${i}`,
  kitchen_id: 'k1',
  date: '2026-10-16',
  meal_type: 'dinner',
  recipe_id: `r${i}`,
  created_at: '2026-10-01T00:00:00Z',
  recipes: { id: `r${i}`, slug: `pie-${i}`, name: `Pie ${i}` },
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 16, 12))
  plan()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('CurrentKitchenPlanner', () => {
  beforeEach(() =>
    mocks.kitchens.mockReturnValue({ kitchens: [kitchen], status: 'ready', retry: vi.fn() }),
  )

  it('shows the skeleton while kitchens load, without the kitchens link', () => {
    mocks.kitchens.mockReturnValue({ kitchens: [], status: 'loading', retry: vi.fn() })
    render(<CurrentKitchenPlanner />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading plan')
    expect(screen.queryByRole('link', { name: /kitchens/i })).toBeNull()
  })

  it('retries kitchens on error', () => {
    const retry = vi.fn()
    mocks.kitchens.mockReturnValue({ kitchens: [], status: 'error', retry })
    render(<CurrentKitchenPlanner />)
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(retry).toHaveBeenCalled()
  })

  it('links to kitchen settings when none is live', () => {
    mocks.kitchens.mockReturnValue({ kitchens: [], status: 'ready', retry: vi.fn() })
    render(<CurrentKitchenPlanner />)
    expect(screen.getByText('Create a kitchen to start planning.')).toBeTruthy()
    expect(screen.getByRole('link').getAttribute('href')).toBe('/settings/kitchens')
  })

  it('plans the current kitchen', () => {
    render(<CurrentKitchenPlanner />)
    expect(mocks.plan).toHaveBeenCalledWith('k1', expect.any(String), expect.any(String))
  })
})

describe('MealPlanner', () => {
  it('shows the skeleton while slots load', () => {
    plan({ status: 'loading' })
    render(<MealPlanner kitchenId="k1" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading plan')
  })

  it('retries the plan on error', () => {
    const retry = vi.fn()
    plan({ status: 'error', retry })
    render(<MealPlanner kitchenId="k1" />)
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(retry).toHaveBeenCalled()
  })

  it('renders seven day headers with today marked', () => {
    render(<MealPlanner kitchenId="k1" />)
    const heads = screen.getAllByRole('heading', { level: 2 })
    expect(heads).toHaveLength(7)
    expect(heads.map((h) => h.getAttribute('aria-current'))).toEqual([
      null,
      null,
      null,
      null,
      null,
      'date',
      null,
    ])
    expect(mocks.plan).toHaveBeenCalledWith('k1', '2026-10-11', '2026-10-17')
  })

  it('moves today at midnight but keeps the week it opened on', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 17, 23, 59, 30))
    render(<MealPlanner kitchenId="k1" />)
    act(() => void vi.advanceTimersByTime(60_000))

    const heads = screen.getAllByRole('heading', { level: 2 })
    expect(heads.at(-1)).toHaveTextContent('October 17')
    expect(heads.filter((h) => h.hasAttribute('aria-current'))).toEqual([])
  })

  it('gives every meal from today on an add button', () => {
    render(<MealPlanner kitchenId="k1" />)
    expect(screen.getAllByRole('button', { name: /^Add recipe to / })).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Add recipe to Friday dinner' })).toBeTruthy()
  })

  it('collapses past days to their recipe names until shown', () => {
    plan({
      slotsFor: (d: string, m: string) => (d === '2026-10-12' && m === 'dinner' ? [slot(1)] : []),
    })
    render(<MealPlanner kitchenId="k1" />)
    expect(screen.getByRole('button', { name: 'Show Monday' })).toHaveTextContent('Pie 1')
    expect(screen.getByRole('button', { name: 'Show Sunday' })).toHaveTextContent('Nothing planned')
    expect(screen.queryByRole('button', { name: 'Add recipe to Monday dinner' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Show Monday' }))
    expect(screen.getByRole('button', { name: 'Add recipe to Monday dinner' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hide Monday' }))
    expect(screen.queryByRole('button', { name: 'Add recipe to Monday dinner' })).toBeNull()
  })

  it('counts planned meals, not recipes', () => {
    plan({
      slotsFor: (d: string, m: string) =>
        d === '2026-10-16' && m === 'dinner' ? [slot(1), slot(2)] : [],
    })
    render(<MealPlanner kitchenId="k1" />)
    expect(screen.getByText('1 of 21 meals planned')).toBeTruthy()
  })

  it.each([
    ['left', -400],
    ['right', 400],
  ])('scrolls a day %s by most of its width', (side, left) => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500)
    const scrollBy = vi.fn()
    Element.prototype.scrollBy = scrollBy
    render(<MealPlanner kitchenId="k1" />)
    fireEvent.click(screen.getAllByLabelText(`Scroll ${side}`)[0])
    expect(scrollBy).toHaveBeenCalledWith({ left, behavior: 'smooth' })
  })
})
