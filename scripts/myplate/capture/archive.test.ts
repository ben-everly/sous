import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchFromArchive } from './archive'

const serve = (...responses: Response[]) => {
  const queue = [...responses]
  return vi.fn(async () => queue.shift() ?? new Response(null, { status: 599 }))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('fetchFromArchive', () => {
  it('retries a 429 and returns what the retry serves', async () => {
    globalThis.fetch = serve(
      new Response(null, { status: 429 }),
      new Response('<html>ok</html>', { status: 200 }),
    )
    const result = fetchFromArchive('https://web.archive.org/x', 60_000)
    await vi.advanceTimersByTimeAsync(2_000)

    expect(await result).toMatchObject({ httpStatus: 200, body: '<html>ok</html>' })
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('waits the Retry-After the Archive asked for rather than its own backoff', async () => {
    globalThis.fetch = serve(
      new Response(null, { status: 429, headers: { 'retry-after': '1' } }),
      new Response('served', { status: 200 }),
    )
    const result = fetchFromArchive('https://web.archive.org/x', 60_000)
    await vi.advanceTimersByTimeAsync(1_000)

    expect(await result).toMatchObject({ body: 'served' })
  })

  it('gives up after four attempts and reports the status it kept getting', async () => {
    globalThis.fetch = serve(
      ...Array.from({ length: 4 }, () => new Response(null, { status: 503 })),
    )
    const result = fetchFromArchive('https://web.archive.org/x', 60_000)
    await vi.advanceTimersByTimeAsync(2_000 + 4_000 + 8_000)

    expect(await result).toEqual({ failure: 'HTTP 503' })
    expect(globalThis.fetch).toHaveBeenCalledTimes(4)
  })

  it('retries a request that throws and reports the last error', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('socket hang up')
    })
    const result = fetchFromArchive('https://web.archive.org/x', 60_000)
    await vi.advanceTimersByTimeAsync(2_000 + 4_000 + 8_000)

    expect(await result).toEqual({ failure: 'socket hang up' })
    expect(globalThis.fetch).toHaveBeenCalledTimes(4)
  })

  it('does not retry a status the Archive already answered with', async () => {
    globalThis.fetch = serve(new Response(null, { status: 404 }))

    expect(await fetchFromArchive('https://web.archive.org/x', 60_000)).toMatchObject({
      httpStatus: 404,
      body: '',
    })
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('reads the served capture out of the Memento-Datetime header', async () => {
    globalThis.fetch = serve(
      new Response('page', {
        status: 200,
        headers: { 'memento-datetime': 'Tue, 10 Feb 2026 00:00:00 GMT' },
      }),
    )

    expect(await fetchFromArchive('https://web.archive.org/x', 60_000)).toMatchObject({
      servedTimestamp: '20260210000000',
    })
  })
})
