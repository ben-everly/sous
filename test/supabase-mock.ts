import { PostgrestClient } from '@supabase/postgrest-js'
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
    select: Result<Row[] | null>
    insert: Result<Row | null>
    update: Result<{ id: string } | Row | null>
    rpc: Result<Row | null> | ((args: { kitchen_id: string }) => Result<Row | null>)
  }
  rpcSpy: (name: string, args: unknown) => void
  insertSpy: (obj: unknown) => void
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

    if (url.pathname.includes('/rpc/')) {
      const name = url.pathname.slice(url.pathname.indexOf('/rpc/') + 5)
      state.rpcSpy(name, body ?? {})
      const rpc = state.results.rpc
      const r = typeof rpc === 'function' ? rpc(body as { kitchen_id: string }) : rpc
      return toResponse(r, 'single')
    }
    if (method === 'GET') return toResponse(state.results.select, 'array')
    if (method === 'POST') {
      state.insertSpy(Array.isArray(body) ? body[0] : body)
      // The insert fetcher requests representation without .single(), so it expects an array.
      return toResponse(state.results.insert, 'array')
    }
    if (method === 'PATCH') {
      // The update fetcher is .single(), so it expects a bare object.
      return toResponse(state.results.update, 'single')
    }
    return jsonResponse([])
  }

  return new PostgrestClient(`${MOCK_SUPABASE_URL}/rest/v1`, {
    schema: 'public',
    fetch,
  }) as unknown as SupabaseClient<Database>
}
