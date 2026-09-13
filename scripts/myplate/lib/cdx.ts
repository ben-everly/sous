import { fetchFromArchive } from './archive.ts'
import { type Config } from './config.ts'
import { message } from './errors.ts'
import { type Store } from './store.ts'

// CDX is the Internet Archive's capture index: one line per archived snapshot, columns named by
// CDX_FIELDS. The CDX Server API queries it; enumerate caches a whole response, which takes minutes.
const CDX_ENDPOINT = 'https://web.archive.org/cdx/search/cdx'
const RECIPE_PREFIX = 'myplate.gov/recipes/*'

const CDX_FIELDS = ['original', 'timestamp', 'statuscode', 'digest', 'length'] as const

export type CdxRow = Record<(typeof CDX_FIELDS)[number], string>

export const cdxUrl = (cutoff: string) => {
  const params = new URLSearchParams({
    url: RECIPE_PREFIX,
    output: 'json',
    fl: CDX_FIELDS.join(','),
    to: cutoff,
  })
  params.append('filter', 'statuscode:200')
  params.append('filter', 'mimetype:text/html')
  return `${CDX_ENDPOINT}?${params}`
}

export const parseCdx = (body: string): CdxRow[] => {
  const [header, ...rows] = JSON.parse(body) as string[][]
  if (!header) return []
  const columns = CDX_FIELDS.map((field) => [field, header.indexOf(field)] as const)
  const missing = columns.filter(([, i]) => i < 0).map(([field]) => field)
  if (missing.length) throw new Error(`CDX response missing fields: ${missing.join(', ')}`)
  return rows.map(
    (row) => Object.fromEntries(columns.map(([field, i]) => [field, row[i]])) as CdxRow,
  )
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
  const fetched = await fetchFromArchive(cdxUrl(cutoff), 600_000)
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
