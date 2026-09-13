import { parseArgs } from 'node:util'

// Content is good through 2026-02-17; later captures are byte-identical empty shells.
export const CUTOFF = '20260217235959'

export const cutoffCeiling = (raw: string) =>
  /^\d{4}(?:\d{2}){0,5}$/.test(raw) ? raw + '99991231235959'.slice(raw.length) : null

export const DEFAULTS = { out: 'data/myplate', cutoff: CUTOFF, delay: '1000' }

const OPTIONS = {
  out: { type: 'string', default: DEFAULTS.out },
  cutoff: { type: 'string', default: DEFAULTS.cutoff },
  delay: { type: 'string', default: DEFAULTS.delay },
  limit: { type: 'string' },
  'refetch-cdx': { type: 'boolean', default: false },
  force: { type: 'boolean', default: false },
  'dry-run': { type: 'boolean', default: false },
  help: { type: 'boolean', default: false },
} as const

export const HELP = `Capture the USDA MyPlate Kitchen recipe corpus from the Internet Archive.

  node scripts/myplate/capture.ts [options]

  --out <dir>        output root (default ${DEFAULTS.out})
  --cutoff <ts>      CDX ceiling; a yyyyMMddhhmmss prefix (default ${DEFAULTS.cutoff})
  --delay <ms>       pause between playback requests (default ${DEFAULTS.delay})
  --limit <n>        stop after n pages
  --refetch-cdx      re-enumerate even if a cached CDX response exists
  --force            re-fetch pages already recorded in the manifest
  --dry-run          enumerate and report, fetch no pages
  --help
`

export type Config = {
  out: string
  cutoff: string
  delayMs: number
  limit?: number
  refetchCdx: boolean
  force: boolean
  dryRun: boolean
}

export type Configured = { help: true } | { errors: string[] } | { config: Config }

const nonNegative = (name: string, raw: string, errors: string[]) => {
  const value = Number(raw)
  if (Number.isFinite(value) && value >= 0) return value
  errors.push(`--${name} must be a non-negative number (got "${raw}")`)
  return 0
}

export const configure = (argv: string[]): Configured => {
  let flags
  try {
    flags = parseArgs({ args: argv, options: OPTIONS }).values
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : String(error)] }
  }
  if (flags.help) return { help: true }

  const errors: string[] = []
  const cutoff = cutoffCeiling(flags.cutoff)
  if (cutoff === null)
    errors.push(
      `--cutoff must be a yyyyMMddhhmmss prefix of 4, 6, 8, 10, 12 or 14 digits (got "${flags.cutoff}")`,
    )
  const delayMs = nonNegative('delay', flags.delay, errors)
  const limit = flags.limit === undefined ? undefined : nonNegative('limit', flags.limit, errors)
  if (cutoff === null || errors.length) return { errors }

  return {
    config: {
      out: flags.out,
      cutoff,
      delayMs,
      limit,
      refetchCdx: flags['refetch-cdx'],
      force: flags.force,
      dryRun: flags['dry-run'],
    },
  }
}
