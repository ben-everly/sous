import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeWrapper } from '@/test/query-wrapper'
import { mockSupabase, resetMockSupabase } from '@/test/supabase-mock'
import { RecipePicker } from './recipe-picker'

vi.mock('@/lib/supabase/client')

const hits = [
  { id: 'r2', slug: 'z-soup', name: 'Zesty Soup' },
  { id: 'r1', slug: 'a-pie', name: 'Apple Pie' },
]

const setup = (props: { disabled?: boolean; planned?: string[] } = {}) => {
  const onPick = vi.fn()
  render(
    <RecipePicker label="Add recipe to Sunday dinner" onPick={onPick} {...props}>
      +
    </RecipePicker>,
    { wrapper: makeWrapper().wrapper },
  )
  return onPick
}
const open = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Add recipe to Sunday dinner' }))
const type = (value: string) =>
  fireEvent.change(screen.getByPlaceholderText('Search recipes...'), { target: { value } })
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

beforeEach(() => {
  vi.useFakeTimers()
  resetMockSupabase()
  mockSupabase.results.rpc = { data: hits, error: null }
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('RecipePicker', () => {
  it('sends no request for a blank or whitespace query and shows no empty message', async () => {
    setup()
    open()
    type('   ')
    await advance(500)
    expect(mockSupabase.rpcSpy).not.toHaveBeenCalled()
    expect(screen.queryByText('No recipes found.')).not.toBeInTheDocument()
  })

  it('sends one search after 250ms of no typing', async () => {
    setup()
    open()
    type('p')
    await advance(100)
    type('pi')
    await advance(100)
    type('pie')
    await advance(200)
    expect(mockSupabase.rpcSpy).not.toHaveBeenCalled()
    await advance(100)
    expect(mockSupabase.rpcSpy).toHaveBeenCalledTimes(1)
    expect(mockSupabase.rpcSpy).toHaveBeenCalledWith('search_recipes', { query: 'pie' })
  })

  it('lists hits in RPC order', async () => {
    setup()
    open()
    type('pie')
    await advance(300)
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Zesty Soup',
      'Apple Pie',
    ])
  })

  it('keeps the previous hits, unpickable, until the next search lands', async () => {
    const onPick = setup()
    open()
    type('pie')
    await advance(300)
    type('pies')
    const stale = screen.getAllByRole('option')
    expect(stale.map((o) => o.textContent)).toEqual(['Zesty Soup', 'Apple Pie'])
    stale.forEach((o) => expect(o).toHaveAttribute('aria-disabled', 'true'))
    fireEvent.click(screen.getByText('Apple Pie'))
    expect(onPick).not.toHaveBeenCalled()

    await advance(300)
    expect(mockSupabase.rpcSpy).toHaveBeenLastCalledWith('search_recipes', { query: 'pies' })
    screen
      .getAllByRole('option')
      .forEach((o) => expect(o).not.toHaveAttribute('aria-disabled', 'true'))
  })

  it('shows searching before the first hits arrive', async () => {
    setup()
    open()
    type('pie')
    expect(screen.getByText('Searching...')).toBeInTheDocument()
  })

  it('shows the empty message when there are no hits', async () => {
    mockSupabase.results.rpc = { data: [], error: null }
    setup()
    open()
    type('zzz')
    await advance(300)
    expect(screen.getByText('No recipes found.')).toBeInTheDocument()
  })

  it('retries a failed search once, then shows an error row', async () => {
    mockSupabase.results.rpc = { data: null, error: { message: 'boom' } }
    setup()
    open()
    type('pie')
    await advance(300)
    expect(mockSupabase.rpcSpy).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await advance(1000)
    expect(mockSupabase.rpcSpy).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('picking a hit calls onPick, closes the popover and clears the input', async () => {
    const onPick = setup()
    open()
    type('pie')
    await advance(300)
    fireEvent.click(screen.getByText('Apple Pie'))
    expect(onPick).toHaveBeenCalledWith('r1')
    expect(screen.queryByPlaceholderText('Search recipes...')).not.toBeInTheDocument()
    open()
    expect(screen.getByPlaceholderText('Search recipes...')).toHaveValue('')
  })

  it('dismissing with Escape clears the search', async () => {
    setup()
    open()
    type('pie')
    await advance(300)
    fireEvent.keyDown(screen.getByPlaceholderText('Search recipes...'), { key: 'Escape' })
    expect(screen.queryByPlaceholderText('Search recipes...')).not.toBeInTheDocument()
    open()
    expect(screen.getByPlaceholderText('Search recipes...')).toHaveValue('')
    expect(screen.queryByText('Apple Pie')).not.toBeInTheDocument()
  })

  it('reopening right after a pick shows no stale results', async () => {
    setup()
    open()
    type('pie')
    await advance(300)
    fireEvent.click(screen.getByText('Apple Pie'))
    open()
    expect(screen.queryByText('Zesty Soup')).not.toBeInTheDocument()
  })

  it('shows searching, not the empty message, while a search after an empty one loads', async () => {
    mockSupabase.results.rpc = { data: [], error: null }
    setup()
    open()
    type('zzz')
    await advance(300)
    type('zzzz')
    expect(screen.getByText('Searching...')).toBeInTheDocument()
    expect(screen.queryByText('No recipes found.')).not.toBeInTheDocument()
  })

  it('shows searching, not the error, while the next search loads', async () => {
    mockSupabase.results.rpc = { data: null, error: { message: 'boom' } }
    setup()
    open()
    type('pie')
    await advance(300)
    await advance(1000)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    type('pies')
    expect(screen.getByText('Searching...')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('marks recipes already in the meal as added and unpickable', async () => {
    const onPick = setup({ planned: ['r1'] })
    open()
    type('pie')
    await advance(300)
    const added = screen.getByRole('option', { name: /Apple Pie/ })
    expect(added).toHaveTextContent('Added')
    expect(added).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(added)
    expect(onPick).not.toHaveBeenCalled()
    expect(screen.getByRole('option', { name: 'Zesty Soup' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('a disabled button cannot open the popover', () => {
    setup({ disabled: true })
    open()
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.queryByPlaceholderText('Search recipes...')).not.toBeInTheDocument()
  })
})
