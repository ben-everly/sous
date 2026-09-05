import { groupCounts, playbackUrl, type Capture } from './captures.ts'
import { cdxUrl, parseCdx } from './cdx.ts'
import { type Config } from './config.ts'
import { type Store } from './corpus.ts'
import { backoffMs, mementoTimestamp, parseRetryAfter } from './http.ts'
import { classifyPlayback, readManifest, type Fetched, type ManifestRecord } from './manifest.ts'
import { abortReason, advance, NOTHING_YET, summary } from './progress.ts'

const MAX_ATTEMPTS = 4

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// An unread body keeps its undici socket alive until GC, exhausting the pool mid-run.
const discard = (response: Response) => response.body?.cancel().catch(() => {})

const get = async (url: string, timeoutMs: number): Promise<Fetched> => {
  let failure = 'no attempt made'
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        // Following a redirect would swap in a capture we did not select.
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': 'sous-myplate-capture/1.0 (+https://github.com/ben-everly/sous)' },
      })
      if (response.status === 429 || response.status >= 500) {
        failure = `HTTP ${response.status}`
        await discard(response)
        if (attempt === MAX_ATTEMPTS) break
        const wait = parseRetryAfter(response.headers.get('retry-after'), backoffMs(attempt))
        console.warn(
          `  ${failure} — waiting ${Math.round(wait / 1000)}s (attempt ${attempt}/${MAX_ATTEMPTS})`,
        )
        await sleep(wait)
        continue
      }
      const fetched = {
        httpStatus: response.status,
        location: response.headers.get('location'),
        servedTimestamp: mementoTimestamp(response.headers.get('memento-datetime')),
      }
      if (response.ok) return { ...fetched, body: await response.text() }
      await discard(response)
      return { ...fetched, body: '' }
    } catch (error) {
      failure = message(error)
      if (attempt === MAX_ATTEMPTS) break
      console.warn(
        `  ${failure} — retrying in ${backoffMs(attempt) / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`,
      )
      await sleep(backoffMs(attempt))
    }
  }
  return { failure }
}

export const enumerate = async ({ cutoff, refetchCdx }: Config, store: Store) => {
  const cached = store.where.cdx(cutoff)
  const existing = refetchCdx ? null : await store.readCdxCache(cutoff)
  if (existing) {
    console.log(`CDX: reusing ${cached}`)
    try {
      return parseCdx(existing)
    } catch (error) {
      throw new Error(
        `Cached CDX response at ${cached} is unusable — re-run with --refetch-cdx (${message(error)})`,
      )
    }
  }
  console.log('CDX: enumerating /recipes (this endpoint is slow — minutes, not seconds)')
  const fetched = await get(cdxUrl({ cutoff }), 600_000)
  if ('failure' in fetched) throw new Error(`CDX enumeration failed: ${fetched.failure}`)
  if (fetched.httpStatus !== 200)
    throw new Error(`CDX enumeration failed: HTTP ${fetched.httpStatus}`)
  // Parse before caching: a cached body that will not parse would poison every later run, and
  // re-enumerating costs minutes.
  let rows
  try {
    rows = parseCdx(fetched.body)
  } catch (error) {
    const saved = await store.writeCdxInvalid(cutoff, fetched.body)
    throw new Error(`CDX response was not usable JSON — body saved to ${saved} (${message(error)})`)
  }
  await store.writeCdxCache(cutoff, fetched.body)
  console.log(`CDX: saved ${cached}`)
  return rows
}

const fetchPage = async (capture: Capture, store: Store): Promise<ManifestRecord> => {
  const fetchedAt = new Date().toISOString()
  const fetched = await get(playbackUrl(capture), 60_000)
  const { record, write } = classifyPlayback(capture, fetched)
  if (write && 'body' in fetched) await store.writePage(capture, fetched.body)
  return { ...record, fetchedAt }
}

export const run = async (captures: Capture[], { delayMs, limit, force }: Config, store: Store) => {
  const manifest = store.where.manifest
  const { captured, withoutPage, malformed } = readManifest(
    force ? '' : await store.readManifestFile(),
  )
  if (malformed.length)
    console.warn(
      `Skipped ${malformed.length} unparseable ${malformed.length === 1 ? 'line' : 'lines'} in ${manifest}: ${malformed.slice(0, 10).join(', ')}${malformed.length > 10 ? ', …' : ''}`,
    )
  const pending = captures.filter(({ url }) => !captured.has(url)).slice(0, limit)
  console.log(
    `Fetching ${pending.length} pages (${captured.size} already recorded${
      withoutPage ? `, ${withoutPage} of them with no page on disk` : ''
    }), ~${delayMs}ms apart\n`,
  )
  await store.ensureTree(Object.keys(groupCounts(pending)))

  let progress = NOTHING_YET

  for (const [index, capture] of pending.entries()) {
    if (index) await sleep(delayMs)
    const record = await fetchPage(capture, store)
    await store.appendManifestLine(`${JSON.stringify(record)}\n`)
    progress = advance(progress, record.status)

    const detail =
      record.error ??
      `${record.bytes} bytes${record.template ? ` ${record.template}` : ' NO-INGREDIENTS'}`
    console.log(
      `[${index + 1}/${pending.length}] ${record.status.padEnd(10)} ${store.pageName(capture)} — ${detail}`,
    )

    const abort = abortReason(progress)
    if (abort) {
      console.error(`\nAborting: ${abort}`)
      process.exitCode = 1
      break
    }
  }

  console.log(`\nDone. ${summary(progress)}`)
  console.log(`Pages under ${store.where.pages}, manifest at ${manifest}`)
}
