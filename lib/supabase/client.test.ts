import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBrowserClient } from '@supabase/ssr'
import { createClient } from './client'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_PUBLISHABLE_KEY } from './test-utils'

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({ auth: {}, from: () => ({}) })),
}))

describe('Supabase browser client', () => {
  beforeEach(() => {
    vi.mocked(createBrowserClient).mockClear()
  })

  it('initializes the browser client with the env URL and publishable key', () => {
    const supabase = createClient()

    expect(supabase).toBeDefined()
    expect(createBrowserClient).toHaveBeenCalledWith(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_PUBLISHABLE_KEY,
    )
  })
})
