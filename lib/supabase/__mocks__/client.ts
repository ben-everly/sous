import { createMockClient, mockSupabase } from '@/test/supabase-mock'

export const createClient = () => createMockClient(mockSupabase)
