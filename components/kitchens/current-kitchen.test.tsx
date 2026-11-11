import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ kitchens: vi.fn() }))

vi.mock('./use-kitchens', () => ({ useKitchens: mocks.kitchens }))

import { CurrentKitchenProvider, useCurrentKitchen } from './current-kitchen'

const kitchen = (id: string) => ({
  id,
  name: id,
  created_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
})

function Child() {
  return <p>kitchen {useCurrentKitchen()}</p>
}

const renderProvider = () =>
  render(
    <CurrentKitchenProvider>
      <Child />
    </CurrentKitchenProvider>,
  )

beforeEach(() => mocks.kitchens.mockReset())

it('shows a spinner, not the page, while kitchens load', () => {
  mocks.kitchens.mockReturnValue({ kitchens: [], status: 'loading', retry: vi.fn() })
  renderProvider()
  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(screen.queryByText(/^kitchen/)).toBeNull()
})

it('retries kitchens on error', () => {
  const retry = vi.fn()
  mocks.kitchens.mockReturnValue({ kitchens: [], status: 'error', retry })
  renderProvider()
  expect(screen.getByText('Could not load your kitchens.')).toBeInTheDocument()
  screen.getByRole('button', { name: 'Try again' }).click()
  expect(retry).toHaveBeenCalled()
})

it('links to kitchen settings when none is live', () => {
  mocks.kitchens.mockReturnValue({ kitchens: [], status: 'ready', retry: vi.fn() })
  renderProvider()
  expect(screen.getByRole('heading', { level: 1, name: 'No kitchen yet' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Go to kitchens' })).toHaveAttribute(
    'href',
    '/settings/kitchens',
  )
})

it('gives the page the first live kitchen', () => {
  mocks.kitchens.mockReturnValue({
    kitchens: [kitchen('k1'), kitchen('k2')],
    status: 'ready',
    retry: vi.fn(),
  })
  renderProvider()
  expect(screen.getByText('kitchen k1')).toBeInTheDocument()
})

it('throws outside the provider', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<Child />)).toThrow()
})
