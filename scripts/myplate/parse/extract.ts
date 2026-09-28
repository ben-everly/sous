import { isHandWashing } from './handwashing.ts'
import { clean, lines, text } from './text.ts'

type DirectionSection = { name: string | null; steps: string[] }

type IngredientSection = { name: string | null; items: string[] }

export type Recipe = {
  slug: string
  source_url: string
  name: string
  description: string | null
  ingredients: IngredientSection[]
  directions: DirectionSection[]
  yield: string | null
  nutrition: unknown | null
  notes: string | null
  contributor: string | null
}

type Extracted = { ok: true; recipe: Recipe } | { ok: false; reason: string }

const INGREDIENTS = [
  '.field--name-field-mp-ingredients li.field__item',
  '.field--name-field-ingredients li.field__item',
].join(', ')

const jsonLd = (doc: Document): Record<string, unknown> => {
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let parsed
    try {
      parsed = JSON.parse(script.textContent ?? '')
    } catch {
      continue
    }
    const graph = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed]
    const recipe = graph.find(
      (node: unknown) => (node as Record<string, unknown>)?.['@type'] === 'Recipe',
    )
    if (recipe) return recipe
  }
  return {}
}

const stringOrNull = (value: unknown) =>
  typeof value === 'string' && clean(value) !== '' ? clean(value) : null

// The on-disk slug is a lossy flattening of the URL path — capture decodes %20 to a space and
// then collapses it to a hyphen, indistinguishable from a real one — so the page's own canonical
// link is the only faithful source_url.
const sourceUrlOf = (doc: Document, slug: string) => {
  const canonical = stringOrNull(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'))
  return canonical?.startsWith('https://') ? canonical : `https://www.myplate.gov/recipes/${slug}`
}

// lines() output is already normalized, and re-cleaning it would collapse the line breaks
// that a two-line source credit depends on.
const nullIfEmpty = (value: string) => (value === '' ? null : value)

// Heading styling alone is not enough: every line of an equipment sub-list ("craft sticks",
// "foil") carries it too, so styling alone deletes real entries. A heading also either ends
// with a colon or introduces a plainly styled entry.
const isStyledAsHeading = (item: Element) => {
  const emphasis = item.querySelector('b, strong')
  return (
    (item.getAttribute('style') ?? '').includes('list-style-type: none') ||
    (emphasis !== null && text(emphasis) === text(item))
  )
}

const ingredientsOf = (doc: Document) => {
  const entries = [...doc.querySelectorAll(INGREDIENTS)]
    .map((node) => ({ item: text(node), emphasized: isStyledAsHeading(node) }))
    .filter(({ item }) => item !== '')

  const sections: IngredientSection[] = []
  let current: IngredientSection | null = null

  entries.forEach(({ item, emphasized }, index) => {
    const next = entries[index + 1]
    if (emphasized && (item.endsWith(':') || (next !== undefined && !next.emphasized))) {
      current = { name: item.replace(/:$/, ''), items: [] }
      sections.push(current)
      return
    }
    if (current === null) {
      current = { name: null, items: [] }
      sections.push(current)
    }
    current.items.push(item)
  })

  return sections.filter((section) => section.items.length > 0)
}

const isList = (element: Element | null) => element?.tagName === 'OL' || element?.tagName === 'UL'

const nextBlock = (element: Element) => {
  let sibling = element.nextElementSibling
  while (sibling && !isList(sibling) && text(sibling) === '') sibling = sibling.nextElementSibling
  return sibling
}

// An <ol> specifically: a note ending in a colon above a <ul> of ingredients is prose, not a
// section heading.
const introducesSteps = (element: Element) => nextBlock(element)?.tagName === 'OL'

const sectionLabel = (element: Element) => {
  if (isList(element) || element.querySelector('ol, ul') || !introducesSteps(element)) return null
  const name = text(element)
  const emphasis = element.querySelector('strong, b')
  const heading = name.endsWith(':') || (emphasis !== null && name === text(emphasis))
  return name === '' || !heading ? null : name.replace(/:$/, '')
}

const directionsOf = (doc: Document): DirectionSection[] => {
  const field = doc.querySelector('.field--name-field-instructions .field__item')
  if (!field) return []

  const sections: DirectionSection[] = []
  let current: DirectionSection | null = null
  const openSection = (name: string | null) => {
    current = { name, steps: [] }
    sections.push(current)
    return current
  }

  for (const child of field.children) {
    const label = sectionLabel(child)
    if (label !== null) {
      openSection(label)
      continue
    }
    const section = current ?? openSection(null)
    if (child.tagName === 'OL' || child.tagName === 'UL') {
      for (const item of child.querySelectorAll(':scope > li')) {
        const step = text(item)
        if (step !== '') section.steps.push(step)
      }
      continue
    }
    const block = lines(child)
    if (block !== '') section.steps.push(block)
  }

  const first = sections.find((section) => section.steps.length > 0)
  if (first && isHandWashing(first.steps[0])) first.steps.shift()

  return sections.filter((section) => section.steps.length > 0)
}

// Notes end with a "Learn more about:" line over a <ul> of links into the USDA produce guide —
// sometimes as its own paragraph, sometimes as the last line of the preceding one. Only text is
// stored, so what survives is a list of bare produce words; 957 blocks, all of them trailing.
const LEARN_MORE = /^learn more about:?$/i

const notesOf = (doc: Document) => {
  const body = lines(doc.querySelector('.field--name-field-notes .field__item'))
  const rows = body.split('\n')
  const marker = rows.findIndex((row) => LEARN_MORE.test(row))
  return (marker === -1 ? rows : rows.slice(0, marker)).join('\n').trim()
}

const yieldOf = (doc: Document) => {
  for (const node of doc.querySelectorAll('.mp-recipe-full__detail--label')) {
    if (text(node) !== 'Makes:') continue
    const data = node.parentElement?.querySelector('.mp-recipe-full__detail--data')
    return stringOrNull(text(data))
  }
  return null
}

export const extract = (doc: Document, slug: string): Extracted => {
  const ld = jsonLd(doc)
  const name = stringOrNull(ld.name) ?? stringOrNull(text(doc.querySelector('h1')))
  if (name === null) return { ok: false, reason: 'no name' }

  const ingredients = ingredientsOf(doc)
  if (ingredients.length === 0) return { ok: false, reason: 'no ingredients' }

  const directions = directionsOf(doc)
  if (directions.length === 0) return { ok: false, reason: 'no directions' }

  return {
    ok: true,
    recipe: {
      slug,
      source_url: sourceUrlOf(doc, slug),
      name,
      description:
        stringOrNull(ld.description) ??
        stringOrNull(text(doc.querySelector('.mp-recipe-full__description'))),
      ingredients,
      directions,
      yield: stringOrNull(ld.recipeYield) ?? yieldOf(doc),
      nutrition: ld.nutrition ?? null,
      notes: nullIfEmpty(notesOf(doc)),
      contributor: nullIfEmpty(lines(doc.querySelector('.field--name-field-source .field__item'))),
    },
  }
}
