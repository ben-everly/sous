import { selectCaptures, groupCounts } from './lib/captures.ts'
import { enumerate } from './lib/cdx.ts'
import { configure, HELP } from './lib/config.ts'
import { message } from './lib/errors.ts'
import { run } from './lib/run.ts'
import { diskStore } from './lib/store.ts'

// Returns rather than calling process.exit, which does not flush a piped stdout — `--help`
// and `--dry-run | tee` would lose their output.
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

  const { config } = result
  const store = diskStore(config.out)
  const captures = selectCaptures(await enumerate(config, store), config.cutoff)
  console.log(`Selected ${captures.length} recipe URLs at or before ${config.cutoff}:`)
  for (const [group, count] of groupCounts(captures)) console.log(`  ${group.padEnd(20)} ${count}`)

  if (!config.dryRun) await run(captures, config, store)
}

try {
  await main()
} catch (error) {
  console.error(message(error))
  process.exitCode = 1
}
