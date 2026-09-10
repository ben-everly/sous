import { createHash } from 'node:crypto'

import { type CdxRow } from './cdx.ts'

const PLAYBACK_ORIGIN = 'https://web.archive.org'

export type Capture = {
  url: string
  timestamp: string
  digest: string
  cdxLength: number
  group: string
  slug: string
}

const RECIPE_PATH = /^\/recipes\/[^/]+(?:\/[^/]+)?\/?$/

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const safeSegment = (segment: string) =>
  segment
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '') || 'unnamed'

const toCapture = (row: CdxRow): Capture => {
  const segments = safeDecode(new URL(row.original).pathname).split('/').filter(Boolean).slice(1)
  const group = segments.length > 1 ? safeSegment(segments[0]) : 'flat'
  const slug = safeSegment(segments[segments.length - 1])
  return {
    url: row.original,
    timestamp: row.timestamp,
    digest: row.digest,
    cdxLength: Number(row.length) || 0,
    group,
    slug,
  }
}

const key = ({ group, slug }: Capture) => `${group}/${slug}`

const disambiguate = (captures: Capture[]): Capture[] => {
  const counts = new Map<string, number>()
  for (const capture of captures) counts.set(key(capture), (counts.get(key(capture)) ?? 0) + 1)
  return captures.map((capture) => {
    if ((counts.get(key(capture)) ?? 0) < 2) return capture
    const slug = `${capture.slug}-${createHash('sha1').update(capture.url).digest('hex').slice(0, 8)}`
    return { ...capture, slug }
  })
}

export const selectCaptures = (rows: CdxRow[], cutoff: string): Capture[] => {
  const newest = new Map<string, CdxRow>()
  for (const row of rows) {
    if (row.statuscode !== '200' || row.timestamp > cutoff) continue
    let url: URL
    try {
      url = new URL(row.original)
    } catch {
      continue
    }
    if (url.search || !RECIPE_PATH.test(url.pathname)) continue
    const key = safeDecode(url.pathname).replace(/\/$/, '').toLowerCase()
    const previous = newest.get(key)
    if (!previous || row.timestamp > previous.timestamp) newest.set(key, row)
  }
  return disambiguate([...newest.values()].map(toCapture)).sort((a, b) =>
    key(a).localeCompare(key(b)),
  )
}

export const groupCounts = (captures: Capture[]): [string, number][] =>
  Object.entries(
    captures.reduce<Record<string, number>>((counts, { group }) => {
      counts[group] = (counts[group] ?? 0) + 1
      return counts
    }, {}),
  ).sort(([, a], [, b]) => b - a)

// `id_` serves the archived bytes unrewritten — no Wayback banner, no rewritten URLs.
export const playbackUrl = ({ timestamp, url }: Pick<Capture, 'timestamp' | 'url'>) =>
  `${PLAYBACK_ORIGIN}/web/${timestamp}id_/${url}`
