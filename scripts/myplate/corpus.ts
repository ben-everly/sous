import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type Capture } from './captures.ts'

export type Store = {
  ensureTree: (groups: string[]) => Promise<void>
  readCdxCache: (cutoff: string) => Promise<string | null>
  writeCdxCache: (cutoff: string, body: string) => Promise<void>
  writeCdxInvalid: (cutoff: string, body: string) => Promise<string>
  readManifestFile: () => Promise<string>
  appendManifestLine: (line: string) => Promise<void>
  writePage: (capture: Capture, html: string) => Promise<void>
  where: { pages: string; manifest: string; cdx: (cutoff: string) => string }
}

export const pageName = ({ group, slug }: Capture) => `${group}/${slug}.html`

const readOrNull = async (path: string) => {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

export const diskStore = (out: string): Store => {
  const cdxDir = join(out, 'cdx')
  const pages = join(out, 'pages')
  const manifest = join(out, 'manifest.jsonl')
  const cdx = (cutoff: string) => join(cdxDir, `recipes-${cutoff}.json`)

  return {
    ensureTree: async (groups) => {
      await mkdir(out, { recursive: true })
      await Promise.all(groups.map((group) => mkdir(join(pages, group), { recursive: true })))
    },
    readCdxCache: (cutoff) => readOrNull(cdx(cutoff)),
    // These run at most once a run; a per-page mkdir would be a syscall per capture.
    writeCdxCache: async (cutoff, body) => {
      await mkdir(cdxDir, { recursive: true })
      await writeFile(cdx(cutoff), body)
    },
    writeCdxInvalid: async (cutoff, body) => {
      await mkdir(cdxDir, { recursive: true })
      const path = `${cdx(cutoff)}.invalid`
      await writeFile(path, body)
      return path
    },
    readManifestFile: async () => (await readOrNull(manifest)) ?? '',
    appendManifestLine: (line) => appendFile(manifest, line),
    writePage: (capture, html) => writeFile(join(pages, pageName(capture)), html),
    where: { pages, manifest, cdx },
  }
}

export type MemoryStore = Store & {
  pages: Map<string, string>
  invalid: Map<string, string>
  manifest: () => string
}

export const memoryStore = ({
  manifest = '',
  cdx = {},
}: { manifest?: string; cdx?: Record<string, string> } = {}): MemoryStore => {
  const pages = new Map<string, string>()
  const invalid = new Map<string, string>()
  const cached = new Map(Object.entries(cdx))
  let lines = manifest

  return {
    ensureTree: async () => {},
    readCdxCache: async (cutoff) => cached.get(cutoff) ?? null,
    writeCdxCache: async (cutoff, body) => {
      cached.set(cutoff, body)
    },
    writeCdxInvalid: async (cutoff, body) => {
      invalid.set(cutoff, body)
      return `memory:cdx/recipes-${cutoff}.json.invalid`
    },
    readManifestFile: async () => lines,
    appendManifestLine: async (line) => {
      lines += line
    },
    writePage: async (capture, html) => {
      pages.set(pageName(capture), html)
    },
    where: {
      pages: 'memory:pages',
      manifest: 'memory:manifest.jsonl',
      cdx: (cutoff) => `memory:cdx/recipes-${cutoff}.json`,
    },
    pages,
    invalid,
    manifest: () => lines,
  }
}
