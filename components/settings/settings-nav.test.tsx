import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ pathname: '/settings/kitchens' }))
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }))

import { SettingsNav } from './settings-nav'

afterEach(cleanup)

describe('SettingsNav', () => {
  it('marks the active section with aria-current', () => {
    mocks.pathname = '/settings/kitchens'
    render(<SettingsNav />)
    expect(screen.getByRole('link', { name: 'Kitchens' })).toHaveAttribute('aria-current', 'page')
  })

  it('leaves inactive sections unmarked', () => {
    mocks.pathname = '/settings/elsewhere'
    render(<SettingsNav />)
    expect(screen.getByRole('link', { name: 'Kitchens' })).not.toHaveAttribute('aria-current')
  })
})
