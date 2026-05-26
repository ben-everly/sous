import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_PUBLISHABLE_KEY } from '@/lib/supabase/test-utils'

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', MOCK_SUPABASE_URL)
vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', MOCK_SUPABASE_PUBLISHABLE_KEY)
