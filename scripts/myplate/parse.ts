import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { JSDOM } from 'jsdom'
import { message } from './shared/errors.ts'
import { configure, HELP } from './parse/config.ts'
import { extract } from './parse/extract.ts'
import { type Record, recordSchema } from './parse/record.ts'
import { seedSql } from './parse/seed.ts'

const main = async () => {
  const result = configure(process.argv.slice(2))
  if ('help' in result) {
    console.log(HELP)
    return
  }
  if ('errors' in result) {
    result.errors.forEach((error) => console.error(error))
    process.exitCode = 1
    return
  }

  const { pages, out } = result.config
  const files = (await readdir(pages)).filter((file) => file.endsWith('.html')).sort()
  const records: Record[] = []
  const failures: string[] = []

  for (const file of files) {
    const slug = basename(file, '.html')
    const { window } = new JSDOM(await readFile(join(pages, file), 'utf8'))
    const extracted = extract(window.document, slug)
    window.close()

    if (!extracted.ok) {
      failures.push(`${slug}: ${extracted.reason}`)
      continue
    }
    const parsed = recordSchema.safeParse(extracted.recipe)
    if (!parsed.success) {
      failures.push(
        `${slug}: ${parsed.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ')}`,
      )
      continue
    }
    records.push(parsed.data)
  }

  await writeFile(out, seedSql(records, pages))
  console.log(`Parsed ${records.length}/${files.length} pages into ${out}`)

  if (failures.length) {
    console.error(`\n${failures.length} failures:`)
    failures.forEach((failure) => console.error(`  ${failure}`))
    process.exitCode = 1
  }
}

try {
  await main()
} catch (error) {
  console.error(message(error))
  process.exitCode = 1
}
