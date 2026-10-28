import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { notifyManager } from '@tanstack/react-query'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_PUBLISHABLE_KEY } from '@/lib/supabase/test-utils'

// React Query batches observer notifications on a macrotask, so a cache write made mid-`act()` (e.g.
// a cache-helpers imperative mutation) only re-renders on the next tick. Flush synchronously in tests
// so assertions can read the updated hook result immediately after the awaited call.
notifyManager.setScheduler((cb) => cb())

// Browser APIs jsdom lacks.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof Element !== 'undefined') Element.prototype.scrollIntoView ??= () => {}

// A misspelled or unapplied TZ raises no error, and date tests would quietly run in another zone.
const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone
if (zone !== 'America/Los_Angeles')
  throw new Error(`Tests must run in America/Los_Angeles, not ${zone}`)

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', MOCK_SUPABASE_URL)
vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', MOCK_SUPABASE_PUBLISHABLE_KEY)
