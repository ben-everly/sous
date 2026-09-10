import { backoffMs, mementoTimestamp, parseRetryAfter } from './http.ts'
import { type Fetched } from './manifest.ts'

const MAX_ATTEMPTS = 4

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// An unread body keeps its undici socket alive until GC, exhausting the pool mid-run.
const discard = (response: Response) => response.body?.cancel().catch(() => {})

export const fetchFromArchive = async (url: string, timeoutMs: number): Promise<Fetched> => {
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
