export const MOCK_SUPABASE_URL = 'https://mock.supabase.co'
export const MOCK_SUPABASE_PUBLISHABLE_KEY = 'mock-publishable-key'

export type CookieEntry = { name: string; value: string; options?: Record<string, unknown> }
export type CookieHooks = {
  getAll: () => CookieEntry[]
  setAll: (cookies: CookieEntry[]) => void
}
