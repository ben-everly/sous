import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { type Capture } from './captures'
import { diskStore, pageName } from './store'

const capture: Capture = {
  url: 'https://www.myplate.gov/recipes/snap/apple-cake',
  timestamp: '20260210000000',
  digest: 'DIGEST',
  cdxLength: 100,
  group: 'snap',
  slug: 'apple-cake',
}

describe('pageName', () => {
  it('composes the filename the tree stores a capture under', () => {
    expect(pageName(capture)).toBe('snap/apple-cake.html')
  })
})

describe('diskStore', () => {
  it('names every file in the tree from the output root', () => {
    const { where } = diskStore('data/myplate')
    expect(where.pages).toBe('data/myplate/pages')
    expect(where.manifest).toBe('data/myplate/manifest.jsonl')
    expect(where.cdx('20260217235959')).toBe('data/myplate/cdx/recipes-20260217235959.json')
  })

  it('reports an absent cache as null and an absent manifest as empty', async () => {
    const store = diskStore(await mkdtemp(join(tmpdir(), 'myplate-')))
    expect(await store.readCdxCache('20260217235959')).toBeNull()
    expect(await store.readManifestFile()).toBe('')
  })

  it('writes a page under its group, appends manifest lines, and round-trips the cache', async () => {
    const out = await mkdtemp(join(tmpdir(), 'myplate-'))
    const store = diskStore(out)

    await store.writeCdxCache('20260217235959', '[]')
    expect(await store.readCdxCache('20260217235959')).toBe('[]')
    expect(await store.writeCdxInvalid('20260217235959', 'nope')).toBe(
      join(out, 'cdx', 'recipes-20260217235959.json.invalid'),
    )

    await store.ensureTree(['snap'])
    await store.writePage(capture, '<html></html>')
    expect(await readFile(join(out, 'pages', 'snap', 'apple-cake.html'), 'utf8')).toBe(
      '<html></html>',
    )

    await store.appendManifestLine('one\n')
    await store.appendManifestLine('two\n')
    expect(await store.readManifestFile()).toBe('one\ntwo\n')
  })
})
