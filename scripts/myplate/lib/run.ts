import { fetchFromArchive } from './archive.ts'
import { playbackUrl, type Capture } from './captures.ts'
import { type Config } from './config.ts'
import { classifyPlayback, readManifest, type ManifestRecord } from './manifest.ts'
import { abortReason, advance, NOTHING_YET, summary } from './progress.ts'
import { pageName, type Store } from './store.ts'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const fetchPage = async (capture: Capture, store: Store): Promise<ManifestRecord> => {
  const fetchedAt = new Date().toISOString()
  const fetched = await fetchFromArchive(playbackUrl(capture), 60_000)
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
  const pending = captures.filter((capture) => !captured.has(pageName(capture))).slice(0, limit)
  console.log(
    `Fetching ${pending.length} pages (${captured.size} already recorded${
      withoutPage ? `, ${withoutPage} of them with no page on disk` : ''
    }), ~${delayMs}ms apart\n`,
  )
  await store.ensureTree([...new Set(pending.map(({ group }) => group))])

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
      `[${index + 1}/${pending.length}] ${record.status.padEnd(10)} ${pageName(capture)} — ${detail}`,
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
