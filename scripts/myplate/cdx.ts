export const CDX_ENDPOINT = 'https://web.archive.org/cdx/search/cdx'
export const RECIPE_PREFIX = 'myplate.gov/recipes/*'

// Content is good through 2026-02-17; later captures are byte-identical empty shells.
export const CUTOFF = '20260217235959'

export const cutoffCeiling = (raw: string) =>
  /^\d{4}(?:\d{2}){0,5}$/.test(raw) ? raw + '99991231235959'.slice(raw.length) : null

const CDX_FIELDS = ['original', 'timestamp', 'statuscode', 'digest', 'length'] as const

export type CdxRow = Record<(typeof CDX_FIELDS)[number], string>

export const cdxUrl = ({
  prefix = RECIPE_PREFIX,
  cutoff = CUTOFF,
  limit,
}: { prefix?: string; cutoff?: string; limit?: number } = {}) => {
  const params = new URLSearchParams({
    url: prefix,
    output: 'json',
    fl: CDX_FIELDS.join(','),
    to: cutoff,
  })
  params.append('filter', 'statuscode:200')
  params.append('filter', 'mimetype:text/html')
  if (limit) params.append('limit', String(limit))
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
