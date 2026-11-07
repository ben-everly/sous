import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type * as React from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Slot } from '@/lib/plan/queries'

const mocks = vi.hoisted(() => ({ kitchens: vi.fn(), plan: vi.fn(), search: '' }))

vi.mock('@/components/kitchens/use-kitchens', () => ({ useKitchens: mocks.kitchens }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(mocks.search) }))
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
    stale: false,
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
  mocks.search = ''
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
    expect(screen.getByText('Loading plan')).toBeInTheDocument()
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
    expect(mocks.plan).toHaveBeenCalledWith('k1', expect.any(String))
  })
})

describe('MealPlanner', () => {
  it('shows the skeleton while slots load', () => {
    plan({ status: 'loading' })
    render(<MealPlanner kitchenId="k1" />)
    expect(screen.getByText('Loading plan')).toBeInTheDocument()
  })

  it('retries the plan on error', () => {
    const retry = vi.fn()
    plan({ status: 'error', retry })
    render(<MealPlanner kitchenId="k1" />)
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(retry).toHaveBeenCalled()
  })

  it('names the page in the server-rendered heading', () => {
    const html = renderToString(<MealPlanner kitchenId="k1" />)
    expect(html).toMatch(/<h1[^>]*>.*Meal plan.*<\/h1>/)
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
    expect(mocks.plan).toHaveBeenCalledWith('k1', '2026-10-11')
  })

  it('queries the week from ?week', () => {
    mocks.search = 'week=2026-10-25'
    render(<MealPlanner kitchenId="k1" />)
    expect(mocks.plan).toHaveBeenCalledWith('k1', '2026-10-25')
  })

  it.each([
    ['2026-10-11', 'This week'],
    ['2026-10-18', 'Next week'],
    ['2026-10-04', 'Last week'],
  ])('headlines ?week=%s as %s with its range beside it', (week, heading) => {
    mocks.search = `week=${week}`
    render(<MealPlanner kitchenId="k1" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(heading)
    expect(screen.getByRole('heading', { level: 1 }).nextElementSibling).toHaveTextContent(/^Oct/)
  })

  it.each(['2026-10-25', '2026-10-14'])('uses the range as the h1 for ?week=%s', (week) => {
    mocks.search = `week=${week}`
    render(<MealPlanner kitchenId="k1" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Oct \d+\s*[–-]/)
  })

  it('shows the year for a week outside this year', () => {
    mocks.search = 'week=2025-12-28'
    render(<MealPlanner kitchenId="k1" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('2025')
  })

  describe('week navigation', () => {
    const push = vi.fn()
    beforeEach(() => void vi.spyOn(window.history, 'pushState').mockImplementation(push))
    afterEach(() => void vi.restoreAllMocks())
    const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

    it.each([
      ['Next week', '2026-10-28'],
      ['Previous week', '2026-10-14'],
    ])('%s pushes %s from a misaligned start', (name, week) => {
      mocks.search = 'week=2026-10-21'
      render(<MealPlanner kitchenId="k1" />)
      click(name)
      expect(push).toHaveBeenCalledWith(null, '', `?week=${week}`)
    })

    it('Today pushes the aligned start and is disabled on it', () => {
      mocks.search = 'week=2026-10-21'
      render(<MealPlanner kitchenId="k1" />)
      click('Today')
      expect(push).toHaveBeenCalledWith(null, '', '?week=2026-10-11')
      cleanup()
      mocks.search = 'week=2026-10-11'
      render(<MealPlanner kitchenId="k1" />)
      expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled()
    })

    it('disables Previous at 0001-01-01 and Next at 9999-12-25', () => {
      mocks.search = 'week=0001-01-01'
      render(<MealPlanner kitchenId="k1" />)
      expect(screen.getByRole('button', { name: 'Previous week' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Next week' })).toBeEnabled()
      cleanup()
      mocks.search = 'week=9999-12-25'
      render(<MealPlanner kitchenId="k1" />)
      expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Previous week' })).toBeEnabled()
    })

    it('shows the nav while loading', () => {
      plan({ status: 'loading' })
      render(<MealPlanner kitchenId="k1" />)
      expect(screen.getByRole('button', { name: 'Next week' })).toBeEnabled()
    })
  })

  describe('while the next week loads', () => {
    const old = (d: string, m: string) => (d === '2026-10-12' && m === 'dinner' ? [slot(1)] : [])

    it('keeps the previous week, inert, with a loading status', () => {
      const { container, rerender } = render(<MealPlanner kitchenId="k1" />)
      const status = screen.getByRole('status')
      expect(status).toBeEmptyDOMElement()
      mocks.search = 'week=2026-10-18'
      plan({ stale: true, slotsFor: old })
      rerender(<MealPlanner kitchenId="k1" />)
      expect(mocks.plan).toHaveBeenCalledWith('k1', '2026-10-18')
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Next week')
      expect(screen.getByRole('status')).toBe(status)
      expect(status).toHaveTextContent('Loading week')
      expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('October 11')
      expect(screen.getByRole('button', { name: 'Show Monday' })).toHaveTextContent('Pie 1')
      const grid = container.querySelector('[aria-busy="true"]')
      expect(grid).toHaveAttribute('inert')
      expect(grid).toContainElement(screen.getByRole('button', { name: 'Show Monday' }))
    })

    it("hides the previous week's count from assistive tech and dims it", () => {
      const { rerender } = render(<MealPlanner kitchenId="k1" />)
      mocks.search = 'week=2026-10-18'
      plan({ stale: true, slotsFor: old })
      rerender(<MealPlanner kitchenId="k1" />)
      const note = screen.getByText('1 of 21 meals planned')
      expect(note).toHaveAttribute('aria-hidden', 'true')
      expect(note).toHaveClass('opacity-50')
    })

    it('shows the new week and empties the status once fresh', () => {
      const { container, rerender } = render(<MealPlanner kitchenId="k1" />)
      mocks.search = 'week=2026-10-18'
      plan({ stale: true, slotsFor: old })
      rerender(<MealPlanner kitchenId="k1" />)
      plan({ stale: false })
      rerender(<MealPlanner kitchenId="k1" />)
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
      expect(container.querySelector('[inert]')).toBeNull()
      expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('October 18')
      expect(screen.getAllByRole('button', { name: /^Add recipe to / })).toHaveLength(21)
    })
  })

  it('moves today at midnight but keeps the week it opened on', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 17, 23, 59, 30))
    mocks.search = 'week=2026-10-11'
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

  it('collapses past days in the current week until shown', () => {
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

  it('expands all past days in a past week with no fold buttons', () => {
    mocks.search = 'week=2026-10-04'
    plan({
      slotsFor: (d: string, m: string) => (d === '2026-10-05' && m === 'dinner' ? [slot(1)] : []),
    })
    render(<MealPlanner kitchenId="k1" />)
    const addButtons = screen.getAllByRole('button', { name: /^Add recipe to / })
    expect(addButtons).toHaveLength(21)
    expect(screen.queryByRole('button', { name: /^Show .+$/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Hide .+$/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Add recipe to Sunday dinner' })).toBeTruthy()
  })

  it('expands all days in a future week with no fold buttons', () => {
    mocks.search = 'week=2026-10-25'
    plan({
      slotsFor: (d: string, m: string) => (d === '2026-10-26' && m === 'dinner' ? [slot(1)] : []),
    })
    render(<MealPlanner kitchenId="k1" />)
    const addButtons = screen.getAllByRole('button', { name: /^Add recipe to / })
    expect(addButtons).toHaveLength(21)
    expect(screen.queryByRole('button', { name: /^Show .+$/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Hide .+$/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Add recipe to Monday dinner' })).toBeTruthy()
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
