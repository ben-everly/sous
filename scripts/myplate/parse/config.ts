import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { pagesDir } from '../shared/paths.ts'

const SEED_FILE = 'supabase/seed.sql'

// Only the flat group: the legacy collection URLs repeat its slugs with older, thinner pages,
// and the seed's upsert on slug would let those quietly overwrite the good rows.
const DEFAULT_PAGES = join(pagesDir(), 'flat')

const OPTIONS = {
  dir: { type: 'string', default: DEFAULT_PAGES },
  out: { type: 'string', default: SEED_FILE },
  help: { type: 'boolean', default: false },
} as const

export const HELP = `Parse a directory of captured MyPlate recipe pages into a seed file.

  node scripts/myplate/parse.ts [options]

  --dir <dir>        directory of .html pages to parse (default ${DEFAULT_PAGES})
  --out <file>       seed file to write (default ${SEED_FILE})
  --help
`

type Config = { pages: string; out: string }

type Configured = { help: true } | { errors: string[] } | { config: Config }

export const configure = (argv: string[]): Configured => {
  let flags
  try {
    flags = parseArgs({ args: argv, options: OPTIONS }).values
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : String(error)] }
  }
  if (flags.help) return { help: true }

  const errors: string[] = []
  if (flags.dir.trim() === '') errors.push('--dir must be a directory')
  if (flags.out.trim() === '') errors.push('--out must be a file path')
  if (errors.length) return { errors }

  return { config: { pages: flags.dir, out: flags.out } }
}
