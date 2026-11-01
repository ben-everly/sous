import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeWrapper } from '@/test/query-wrapper'
import { mockSupabase, resetMockSupabase } from '@/test/supabase-mock'
import { mockToast } from '@/test/toast-mock'
import type { Slot } from '@/lib/plan/queries'
import type { MealType } from '@/lib/plan/week'
import { useMealPlan } from './use-meal-plan'

vi.mock('sonner')
vi.mock('@/lib/supabase/client')

const FROM = '2026-10-11'
const TO = '2026-10-17'

let seq = 0
const slot = (date: string, meal_type: MealType, over: Partial<Slot> = {}): Slot => {
  const n = ++seq
  return {
    id: `s${n}`,
    kitchen_id: 'k1',
    date,
    meal_type,
    recipe_id: `r${n}`,
    created_at: `2026-10-10T00:00:${String(n).padStart(2, '0')}Z`,
    recipes: { id: `r${n}`, slug: `recipe-${n}`, name: `Recipe ${n}` },
    ...over,
  }
}

const render = async (until: 'ready' | 'error' = 'ready') => {
  const { queryClient, wrapper } = makeWrapper()
  const hook = renderHook((p) => useMealPlan(p.kitchenId, p.from, p.to), {
    wrapper,
    initialProps: { kitchenId: 'k1', from: FROM, to: TO },
  })
  await waitFor(() => expect(hook.result.current.status).toBe(until))
  return { ...hook, queryClient }
}

const gets = () => mockSupabase.requestSpy.mock.calls.filter(([m]) => m === 'GET').length

beforeEach(() => {
  seq = 0
  vi.resetAllMocks()
  resetMockSupabase()
})

describe('useMealPlan', () => {
  it("reads the kitchen's slots from the first date to the last", async () => {
    await render()
    const [, url] = mockSupabase.requestSpy.mock.calls.find(([m]) => m === 'GET')!
    expect(url.pathname).toMatch(/\/meal_plan_slots$/)
    expect(url.searchParams.get('kitchen_id')).toBe('eq.k1')
    expect(url.searchParams.getAll('date')).toEqual([`gte.${FROM}`, `lte.${TO}`])
  })

  it('surfaces error status when the read fails', async () => {
    mockSupabase.results.select = { data: null, error: { message: 'offline' } }
    await render('error')
  })

  it("loads afresh instead of showing another kitchen's plan", async () => {
    mockSupabase.results.select = { data: [slot('2026-10-12', 'dinner')], error: null }
    const hook = await render()
    mockSupabase.requestSpy.mockImplementationOnce(() => new Promise<void>(() => {}))

    hook.rerender({ kitchenId: 'k2', from: FROM, to: TO })

    expect(hook.result.current.status).toBe('loading')
  })

  it('groups slots by meal in query order', async () => {
    const a = slot('2026-10-12', 'dinner')
    const b = slot('2026-10-12', 'lunch')
    const c = slot('2026-10-12', 'dinner')
    const d = slot('2026-10-13', 'dinner')
    mockSupabase.results.select = { data: [a, b, c, d], error: null }
    const { result } = await render()
    expect(result.current.slotsFor('2026-10-12', 'dinner')).toEqual([a, c])
    expect(result.current.slotsFor('2026-10-12', 'lunch')).toEqual([b])
    expect(result.current.slotsFor('2026-10-13', 'dinner')).toEqual([d])
    expect(result.current.slotsFor('2026-10-14', 'breakfast')).toEqual([])
  })

  it('add upserts ignoring duplicates, shows the slot, then refetches once', async () => {
    const { result } = await render()
    const added = slot('2026-10-14', 'lunch', {
      recipe_id: 'r9',
      recipes: { id: 'r9', slug: 'soup', name: 'Soup' },
    })
    mockSupabase.results.insert = { data: [added], error: null }
    mockSupabase.results.select = { data: [added], error: null }
    const before = gets()

    act(() => result.current.add('2026-10-14', 'lunch', 'r9'))

    await waitFor(() => expect(result.current.slotsFor('2026-10-14', 'lunch')).toEqual([added]))
    const [rows, { prefer, onConflict }] = mockSupabase.upsertSpy.mock.calls[0]
    expect(rows).toEqual([
      { kitchen_id: 'k1', date: '2026-10-14', meal_type: 'lunch', recipe_id: 'r9' },
    ])
    expect(onConflict).toBe('kitchen_id,date,meal_type,recipe_id')
    expect(prefer).toContain('resolution=ignore-duplicates')
    expect(result.current.slotsFor('2026-10-14', 'lunch')[0].recipes.name).toBe('Soup')
    await waitFor(() => expect(gets()).toBe(before + 1))
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it('a duplicate add (zero rows) is a silent success that refetches a slot another client added', async () => {
    const { result } = await render()
    const elsewhere = slot('2026-10-14', 'lunch')
    mockSupabase.results.insert = { data: [], error: null }
    mockSupabase.results.select = { data: [elsewhere], error: null }

    act(() => result.current.add('2026-10-14', 'lunch', elsewhere.recipe_id))

    await waitFor(() => expect(result.current.slotsFor('2026-10-14', 'lunch')).toEqual([elsewhere]))
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it('remove drops the slot', async () => {
    const a = slot('2026-10-12', 'dinner')
    const b = slot('2026-10-12', 'dinner')
    mockSupabase.results.select = { data: [a, b], error: null }
    const { result } = await render()
    mockSupabase.results.delete = { data: [a], error: null }
    mockSupabase.results.select = { data: [b], error: null }

    act(() => result.current.remove(a))

    await waitFor(() => expect(result.current.slotsFor('2026-10-12', 'dinner')).toEqual([b]))
    const [, url] = mockSupabase.requestSpy.mock.calls.find(([m]) => m === 'DELETE')!
    expect(url.searchParams.get('id')).toBe(`in.(${a.id})`)
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it('remove offers an undo that re-adds the recipe to the same meal', async () => {
    const a = slot('2026-10-12', 'dinner')
    mockSupabase.results.select = { data: [a], error: null }
    const { result } = await render()
    mockSupabase.results.delete = { data: [a], error: null }
    mockSupabase.results.select = { data: [], error: null }

    act(() => result.current.remove(a))

    await waitFor(() => expect(mockToast).toHaveBeenCalled())
    const [message, opts] = mockToast.mock.calls[0]
    expect(message).toBe(`Removed "${a.recipes.name}" from Monday dinner`)
    mockSupabase.results.select = { data: [a], error: null }
    act(() => opts.action.onClick())
    await waitFor(() =>
      expect(mockSupabase.upsertSpy).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            date: '2026-10-12',
            meal_type: 'dinner',
            recipe_id: a.recipe_id,
          }),
        ],
        expect.anything(),
      ),
    )
  })

  it('a zero-row remove offers no undo and refetches the stale slot away', async () => {
    const a = slot('2026-10-12', 'dinner')
    mockSupabase.results.select = { data: [a], error: null }
    const { result } = await render()
    mockSupabase.results.delete = { data: [], error: null }
    mockSupabase.results.select = { data: [], error: null }

    act(() => result.current.remove(a))

    await waitFor(() => expect(result.current.slotsFor('2026-10-12', 'dinner')).toEqual([]))
    expect(mockToast).not.toHaveBeenCalled()
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it.each([
    ['add', (r: ReturnType<typeof useMealPlan>) => r.add('2026-10-12', 'dinner', 'r1')],
    ['remove', (r: ReturnType<typeof useMealPlan>) => r.remove(slot('2026-10-12', 'dinner'))],
  ] as const)('a rejected %s toasts and refetches', async (_, run) => {
    const { result } = await render()
    mockSupabase.results.insert = { data: null, error: { message: 'boom' } }
    mockSupabase.results.delete = { data: null, error: { message: 'boom' } }
    const before = gets()

    act(() => run(result.current))

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Couldn't update the plan. Try again."),
    )
    await waitFor(() => expect(gets()).toBe(before + 1))
  })

  it('overlapping writes refetch once, after the last one settles', async () => {
    const { result, queryClient } = await render()
    const gates: Array<() => void> = []
    mockSupabase.upsertSpy.mockImplementation(() => new Promise<void>((r) => gates.push(r)))
    const before = gets()

    act(() => {
      result.current.add('2026-10-12', 'lunch', 'r1')
      result.current.add('2026-10-13', 'dinner', 'r2')
    })
    await waitFor(() => expect(gates).toHaveLength(2))
    gates[0]()
    await waitFor(() => expect(queryClient.isMutating()).toBe(1))
    expect(gets()).toBe(before)
    gates[1]()

    await waitFor(() => expect(gets()).toBe(before + 1))
  })

  it('overlapping writes settling in the same tick still refetch once', async () => {
    const { result, queryClient } = await render()
    const gates: Array<() => void> = []
    mockSupabase.upsertSpy.mockImplementation(() => new Promise<void>((r) => gates.push(r)))
    const before = gets()

    act(() => {
      result.current.add('2026-10-12', 'lunch', 'r1')
      result.current.add('2026-10-13', 'dinner', 'r2')
    })
    await waitFor(() => expect(gates).toHaveLength(2))
    gates.forEach((open) => open())

    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    await waitFor(() => expect(gets()).toBe(before + 1))
  })
})
