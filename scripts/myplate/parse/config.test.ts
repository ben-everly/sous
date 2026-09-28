import { describe, expect, it } from 'vitest'
import { configure } from './config'

describe('configure', () => {
  it('defaults to the flat group of the captured corpus', () => {
    expect(configure([])).toEqual({
      config: { pages: 'data/myplate/pages/flat', out: 'supabase/seed.sql' },
    })
  })

  it('parses any directory of pages, not just one laid out by capture', () => {
    expect(configure(['--dir', '/tmp/hand-picked'])).toEqual({
      config: { pages: '/tmp/hand-picked', out: 'supabase/seed.sql' },
    })
  })

  it('writes the seed file where asked', () => {
    expect(configure(['--out', 'supabase/seeds/recipes.sql'])).toMatchObject({
      config: { out: 'supabase/seeds/recipes.sql' },
    })
  })

  it('reports an unknown flag rather than parsing on', () => {
    expect(configure(['--nope'])).toMatchObject({ errors: expect.any(Array) })
  })

  it('rejects an empty directory', () => {
    expect(configure(['--dir', '  '])).toEqual({ errors: ['--dir must be a directory'] })
  })

  it('rejects an empty seed path', () => {
    expect(configure(['--out', '  '])).toEqual({ errors: ['--out must be a file path'] })
  })

  it('asks for help', () => {
    expect(configure(['--help'])).toEqual({ help: true })
  })
})
