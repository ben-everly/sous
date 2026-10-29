import { PostgrestClient } from '@supabase/postgrest-js'
import { vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { MOCK_SUPABASE_URL } from '@/lib/supabase/test-utils'

export type Row = { id: string; name: string | null; created_at: string; deleted_at: string | null }
type Err = { message: string; code?: string }
type Result<T> = { data: T; error: Err | null }

// cache-helpers reads the real PostgREST builder (its URL, method and headers) to derive query keys
// and evaluate filters, so a hand-rolled thenable won't do — the hook runs against a real
// PostgrestClient whose transport is this fetch, driven by `state`.
export type MockState = {
  results: {
    select: Result<unknown[] | null>
    insert: Result<unknown>
    update: Result<unknown>
    delete: Result<unknown[] | null>
    rpc: Result<unknown> | ((args: never) => Result<unknown>)
  }
  rpcSpy: (name: string, args: unknown) => void
  insertSpy: (obj: unknown) => void
  requestSpy?: (method: string, url: URL) => void | Promise<void>
  upsertSpy?: (
    rows: unknown,
    opts: { prefer: string; onConflict: string | null },
  ) => void | Promise<void>
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function toResponse(r: Result<unknown>, shape: 'array' | 'single'): Response {
  if (r.error) return jsonResponse(r.error, 400)
  if (shape === 'array')
    return jsonResponse(r.data == null ? [] : Array.isArray(r.data) ? r.data : [r.data])
  return jsonResponse(r.data)
}

export function createMockClient(state: MockState): SupabaseClient<Database> {
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input.toString())
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null
    // Snapshot the read before a held request resumes, as a server answers at request time.
    const select = state.results.select
    await state.requestSpy?.(method, url)

    if (url.pathname.includes('/rpc/')) {
      const name = url.pathname.slice(url.pathname.indexOf('/rpc/') + 5)
      state.rpcSpy(name, body ?? {})
      const rpc = state.results.rpc
      const r = typeof rpc === 'function' ? rpc(body as never) : rpc
      return toResponse(r, 'single')
    }
    if (method === 'GET') return toResponse(select, 'array')
    if (method === 'POST') {
      const prefer = new Headers(init?.headers).get('Prefer') ?? ''
      if (prefer.includes('resolution='))
        await state.upsertSpy?.(body, { prefer, onConflict: url.searchParams.get('on_conflict') })
      else state.insertSpy(Array.isArray(body) ? body[0] : body)
      // The insert fetcher requests representation without .single(), so it expects an array.
      return toResponse(state.results.insert, 'array')
    }
    if (method === 'PATCH') {
      // The update fetcher is .single(), so it expects a bare object.
      return toResponse(state.results.update, 'single')
    }
    if (method === 'DELETE') return toResponse(state.results.delete, 'array')
    return jsonResponse([])
  }

  return new PostgrestClient(`${MOCK_SUPABASE_URL}/rest/v1`, {
    schema: 'public',
    fetch,
  }) as unknown as SupabaseClient<Database>
}

const defaults = (): MockState['results'] => ({
  select: { data: [], error: null },
  insert: { data: null, error: null },
  update: { data: null, error: null },
  delete: { data: [], error: null },
  rpc: { data: null, error: null },
})

// Backs lib/supabase/__mocks__/client.ts, so vi.mock('@/lib/supabase/client') drives the client from here.
// Each test file gets its own module instance.
export const mockSupabase = {
  results: defaults(),
  rpcSpy: vi.fn(),
  insertSpy: vi.fn(),
  upsertSpy: vi.fn(),
  requestSpy: vi.fn(),
} satisfies MockState

export function resetMockSupabase() {
  mockSupabase.results = defaults()
  for (const spy of [
    mockSupabase.rpcSpy,
    mockSupabase.insertSpy,
    mockSupabase.upsertSpy,
    mockSupabase.requestSpy,
  ])
    spy.mockReset()
}
