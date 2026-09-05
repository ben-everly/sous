import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Capture } from './captures'
import { CUTOFF } from './cdx'
import { type Config } from './config'
import { memoryStore } from './corpus'
import { run } from './run'

const capture = (slug: string): Capture => ({
  url: `https://www.myplate.gov/recipes/${slug}`,
  timestamp: '20260210000000',
  digest: 'DIGEST',
  cdxLength: 100,
  group: 'flat',
  slug,
})

const config = (over: Partial<Config> = {}): Config => ({
  out: 'memory',
  cutoff: CUTOFF,
  delayMs: 0,
  refetchCdx: false,
  force: false,
  dryRun: false,
  ...over,
})

const RECIPE = '<div class="field-mp-ingredients">1 apple</div>'

const serve = (body: string, status = 200) =>
  vi.fn(
    async () =>
      new Response(status === 200 ? body : null, {
        status,
        headers: { 'memento-datetime': 'Tue, 10 Feb 2026 00:00:00 GMT' },
      }),
  )

const recorded = (store: ReturnType<typeof memoryStore>) =>
  store
    .manifest()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { slug: string; status: string })

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  process.exitCode = undefined
})

describe('run', () => {
  it('skips a url the manifest already recorded, and --force fetches it again', async () => {
    const manifest = `${JSON.stringify({ url: capture('a').url, status: 'ok' })}\n`
    globalThis.fetch = serve(RECIPE)

    const resumed = memoryStore({ manifest })
    await run([capture('a'), capture('b')], config(), resumed)
    expect([...resumed.pages.keys()]).toEqual(['flat/b.html'])

    const forced = memoryStore({ manifest })
    await run([capture('a'), capture('b')], config({ force: true }), forced)
    expect([...forced.pages.keys()]).toEqual(['flat/a.html', 'flat/b.html'])
  })

  it('stops after --limit pages', async () => {
    globalThis.fetch = serve(RECIPE)
    const store = memoryStore()
    await run([capture('a'), capture('b'), capture('c')], config({ limit: 2 }), store)
    expect(store.pages.size).toBe(2)
  })

  it('keeps a shell on disk but writes nothing for a capture the Archive does not have', async () => {
    globalThis.fetch = serve('<html>gone</html>', 404)
    const missing = memoryStore()
    await run([capture('a')], config(), missing)
    expect(missing.pages.size).toBe(0)
    expect(recorded(missing)).toMatchObject([{ status: 'missing' }])

    globalThis.fetch = serve('<html>no ingredients</html>')
    const shell = memoryStore()
    await run([capture('b')], config(), shell)
    expect([...shell.pages.keys()]).toEqual(['flat/b.html'])
    expect(recorded(shell)).toMatchObject([{ status: 'shell' }])
  })

  it('aborts on a run of shells, keeping the records it already wrote', async () => {
    globalThis.fetch = serve('<html>no ingredients</html>')
    const store = memoryStore()
    await run(
      Array.from({ length: 14 }, (_, i) => capture(`r${i}`)),
      config(),
      store,
    )
    expect(recorded(store)).toHaveLength(10)
    expect(process.exitCode).toBe(1)
  })
})
