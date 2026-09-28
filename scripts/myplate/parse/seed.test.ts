import { describe, expect, it } from 'vitest'
import { type Record } from './record'
import { seedSql, statement } from './seed'

const record = (overrides: Partial<Record> = {}): Record => ({
  slug: 'mango-salsa1',
  source_url: 'https://www.myplate.gov/recipes/mango-salsa1',
  name: 'Mango Salsa',
  description: null,
  ingredients: [{ name: null, items: ['2 mangoes'] }],
  directions: [{ name: null, steps: ['Dice.'] }],
  yield: '4 Servings',
  nutrition: null,
  notes: null,
  contributor: null,
  ...overrides,
})

describe('statement', () => {
  it('upserts on slug so a second apply is a no-op', () => {
    const sql = statement([record()])
    expect(sql).toContain('on conflict (slug) do update set')
    expect(sql).toContain('name = excluded.name')
    expect(sql).not.toContain('slug = excluded.slug')
  })

  it('doubles single quotes rather than escaping them', () => {
    expect(statement([record({ name: "Grandma's Chili" })])).toContain("Grandma''s Chili")
  })

  it('declares each column type so Postgres does the casting', () => {
    expect(statement([record()])).toContain(
      'slug text, source_url text, name text, description text, ingredients jsonb, ' +
        'directions jsonb, yield text, nutrition jsonb, notes text, contributor text',
    )
  })

  it('writes one JSON object per line so a changed recipe stays a one-line diff', () => {
    const sql = statement([record(), record({ slug: 'other' })])
    expect(sql).toContain('{"slug":"mango-salsa1"')
    expect(sql).toContain('\n{"slug":"other"')
  })

  it('leaves absent optional columns as JSON null, which arrives as SQL null', () => {
    expect(statement([record()])).toContain('"nutrition":null,"notes":null,"contributor":null')
  })

  it('emits an empty array rather than a malformed statement for no records', () => {
    expect(statement([])).toContain("jsonb_to_recordset('[]'::jsonb)")
  })
})

describe('seedSql', () => {
  it('records the row count and warns the file is generated', () => {
    const sql = seedSql([record(), record({ slug: 'other' })], 'data/myplate/pages/flat')
    expect(sql).toContain('Do not edit by hand')
    expect(sql).toContain('2 recipes')
  })
})
