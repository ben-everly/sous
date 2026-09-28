import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extract, type Recipe } from './extract'

const fixture = (slug: string) => {
  const html = readFileSync(join(import.meta.dirname, 'fixtures', `${slug}.html`), 'utf8')
  const result = extract(new DOMParser().parseFromString(html, 'text/html'), slug)
  if (!result.ok) throw new Error(`${slug} failed to parse: ${result.reason}`)
  return result.recipe
}

const parse = (body: string, slug = 'probe') =>
  extract(new DOMParser().parseFromString(body, 'text/html'), slug)

const page = ({
  head = '',
  title = 'Probe',
  details = '',
  ingredients = '<li class="field__item">1 apple</li>',
  instructions = '<ol><li>Stir.</li></ol>',
  notes = '',
}) => `
  ${head}
  <h1>${title}</h1>
  ${details}
  <div class="field--name-field-mp-ingredients"><ul>${ingredients}</ul></div>
  <div class="field--name-field-instructions"><div class="field__item">${instructions}</div></div>
  <div class="field--name-field-notes"><div class="field__item">${notes}</div></div>`

const steps = (recipe: Recipe) => recipe.directions.flatMap((section) => section.steps)
const items = (recipe: Recipe) => recipe.ingredients.flatMap((section) => section.items)

describe('extract', () => {
  it('reads the newer field-mp-ingredients markup, keeping a span.notes parenthetical', () => {
    expect(items(fixture('argentinean-grilled-steak-salsa-criolla'))).toContain(
      '1 large, ripe tomato (cored, seeded, and finely chopped, about 1/2 cup)',
    )
  })

  it('reads the older field-ingredients markup', () => {
    expect(items(fixture('apple-tuna-sandwiches'))).toContain(
      '1 can (6.5 ounces) tuna, packed in water, drained',
    )
  })

  it('groups ingredients under their own headings', () => {
    expect(
      fixture('argentinean-grilled-steak-salsa-criolla').ingredients.map((section) => section.name),
    ).toEqual(['For the sauce', 'For the steak'])
  })

  it('opens an unnamed ingredient section when the list starts without a heading', () => {
    const recipe = fixture('apple-tuna-sandwiches')
    expect(recipe.ingredients).toHaveLength(1)
    expect(recipe.ingredients[0].name).toBeNull()
  })

  it('reads an ingredient heading marked only by <b>, without the trailing colon', () => {
    const result = parse(
      page({
        ingredients:
          '<li class="field__item">1 apple</li><li class="field__item"><b>Topping:</b></li><li class="field__item">2 walnuts</li>',
      }),
    )
    expect(result.ok && result.recipe.ingredients).toEqual([
      { name: null, items: ['1 apple'] },
      { name: 'Topping', items: ['2 walnuts'] },
    ])
  })

  it('reads a marked entry without a colon as a heading when an unmarked entry follows', () => {
    const result = parse(
      page({
        ingredients:
          '<li class="field__item"><b>Sauce</b></li><li class="field__item">1 tomato</li>',
      }),
    )
    expect(result.ok && result.recipe.ingredients).toEqual([{ name: 'Sauce', items: ['1 tomato'] }])
  })

  it('keeps a run of marked entries, as in an equipment sub-list, rather than treating them as headings', () => {
    const marked = (entry: string) =>
      `<li class="field__item" style="list-style-type: none">${entry}</li>`
    const result = parse(
      page({
        ingredients: `<li class="field__item">1 apple</li><li class="field__item"><b>Equipment:</b></li>${marked('craft sticks')}${marked('foil')}`,
      }),
    )
    expect(result.ok && result.recipe.ingredients).toEqual([
      { name: null, items: ['1 apple'] },
      { name: 'Equipment', items: ['craft sticks', 'foil'] },
    ])
  })

  it('names every labelled section, including the first', () => {
    const recipe = fixture('argentinean-grilled-steak-salsa-criolla')
    expect(recipe.directions.map((section) => section.name)).toEqual([
      'For the sauce',
      'For the steak',
    ])
    expect(steps(recipe)).toHaveLength(6)
  })

  it('names sections labelled with a bare paragraph rather than <strong>', () => {
    expect(fixture('au-gratin-potatoes').directions.map((section) => section.name)).toEqual([
      'Quickest Method',
      'Creamiest Method',
    ])
  })

  it('keeps content that follows the last </ol>', () => {
    const recipe = fixture('cranberry-pumpkin-muffins')
    expect(steps(recipe).at(-1)).toBe('Bake at 400 °F for 15 to 30 minutes.')
  })

  it('treats a colon-terminated note above a <ul> as a step, not a section name', () => {
    const recipe = fixture('20-minute-chicken-creole')
    expect(recipe.directions.map((section) => section.name)).toEqual([null])
    expect(steps(recipe).some((step) => step.startsWith('* Store bought chili sauce'))).toBe(true)
  })

  it('drops the trailing "Learn more about:" produce links from notes', () => {
    expect(fixture('cranberry-pumpkin-muffins').notes).toBe(
      'Serve with a glass of low-fat milk for a healthy snack.',
    )
  })

  it('drops the block when the marker ends the preceding paragraph', () => {
    const result = parse(
      page({
        notes:
          '<p>Refrigeration is needed before serving.<br><br>Learn more about:</p><ul><li>Cabbage</li></ul>',
      }),
    )
    expect(result.ok && result.recipe.notes).toBe('Refrigeration is needed before serving.')
  })

  it('keeps a sentence that merely starts with the same words', () => {
    const sentence = "Learn more about fruits and what's in season now."
    const result = parse(page({ notes: `<p>Use any fruit.</p><p>${sentence}</p>` }))
    expect(result.ok && result.recipe.notes).toBe(`Use any fruit.\n${sentence}`)
  })

  it('keeps the source credit one line per block', () => {
    expect(fixture('cranberry-pumpkin-muffins').contributor).toBe(
      'Pumpkin Post and Banana Beat Newsletters\nUniversity of Massachusetts Extension\nNutrition Education Program',
    )
  })

  it('drops a hand-washing first step', () => {
    const result = parse(
      page({ instructions: '<ol><li>Wash hands with soap and water.</li><li>Stir.</li></ol>' }),
    )
    expect(result.ok && steps(result.recipe)).toEqual(['Stir.'])
  })

  it('keeps a hand-washing step that is not first', () => {
    const result = parse(
      page({
        instructions: '<ol><li>Cut the chicken.</li><li>Wash hands with soap and water.</li></ol>',
      }),
    )
    expect(result.ok && steps(result.recipe)).toEqual([
      'Cut the chicken.',
      'Wash hands with soap and water.',
    ])
  })

  it('keeps a first step that continues past the hand-washing', () => {
    const step = 'Wash hands with soap and water and clean food preparation area.'
    const result = parse(page({ instructions: `<ol><li>${step}</li></ol>` }))
    expect(result.ok && steps(result.recipe)).toEqual([step])
  })

  it('drops an empty ingredient <li>', () => {
    const result = parse(
      page({ ingredients: '<li class="field__item"></li><li class="field__item">1 apple</li>' }),
    )
    expect(result.ok && result.recipe.ingredients).toEqual([{ name: null, items: ['1 apple'] }])
  })

  it('prefers the JSON-LD name, description and yield over the page markup', () => {
    const ld = {
      '@type': 'Recipe',
      name: 'Mango Salsa',
      description: 'A fruit salsa.',
      recipeYield: '2 cups',
    }
    const result = parse(
      page({ head: `<script type="application/ld+json">${JSON.stringify(ld)}</script>` }),
    )
    expect(result.ok && result.recipe).toMatchObject({
      name: 'Mango Salsa',
      description: 'A fruit salsa.',
      yield: '2 cups',
    })
  })

  it('falls back to the page markup when JSON-LD has no name, description or yield', () => {
    const result = parse(
      page({
        details: `
          <div class="mp-recipe-full__description">A fruit salsa.</div>
          <div><span class="mp-recipe-full__detail--label">Makes:</span><span class="mp-recipe-full__detail--data">4 Servings</span></div>`,
      }),
    )
    expect(result.ok && result.recipe).toMatchObject({
      name: 'Probe',
      description: 'A fruit salsa.',
      yield: '4 Servings',
    })
  })

  it('takes source_url from the canonical link, which keeps escapes the slug has lost', () => {
    const result = parse(
      page({
        head: '<link rel="canonical" href="https://www.myplate.gov/recipes/eggs%20and-cheese" />',
      }),
      'eggs-and-cheese',
    )
    expect(result.ok && result.recipe.source_url).toBe(
      'https://www.myplate.gov/recipes/eggs%20and-cheese',
    )
  })

  it('falls back to the slug when the canonical link is missing or not https', () => {
    const missing = parse(page({}))
    expect(missing.ok && missing.recipe.source_url).toBe('https://www.myplate.gov/recipes/probe')
    const relative = parse(page({ head: '<link rel="canonical" href="/recipes/probe" />' }))
    expect(relative.ok && relative.recipe.source_url).toBe('https://www.myplate.gov/recipes/probe')
  })

  it('fails a page with no name', () => {
    expect(parse(page({ title: '' }))).toEqual({ ok: false, reason: 'no name' })
  })

  it('fails a page with no ingredients rather than emitting a blank record', () => {
    expect(parse(page({ ingredients: '' }))).toEqual({ ok: false, reason: 'no ingredients' })
  })

  it('fails a page with no directions', () => {
    expect(parse(page({ instructions: '' }))).toEqual({ ok: false, reason: 'no directions' })
  })
})
