import { describe, expect, it } from 'vitest'
import { clean, lines, text } from './text'

const element = (html: string) => {
  const host = document.createElement('div')
  host.innerHTML = html
  return host
}

describe('clean', () => {
  it('strips zero-width spaces and collapses runs of whitespace', () => {
    expect(clean('  1 apple​\n  diced ')).toBe('1 apple diced')
  })

  it('collapses a non-breaking space, so a label matches its plain-text form', () => {
    expect(clean('For the steak:')).toBe('For the steak:')
  })
})

describe('text', () => {
  it('reads an element as a single normalized line', () => {
    expect(text(element('<li>1 large tomato <span class="notes">(chopped)</span></li>'))).toBe(
      '1 large tomato (chopped)',
    )
  })

  it('is empty for a missing element', () => {
    expect(text(null)).toBe('')
  })
})

describe('lines', () => {
  it('turns <br> into a line break', () => {
    expect(lines(element('<p><em>Simple Healthy Recipes</em><br>\nONIE Project</p>'))).toBe(
      'Simple Healthy Recipes\nONIE Project',
    )
  })

  it('separates block elements and drops empty ones', () => {
    expect(lines(element('<p>First.</p><p></p><ul><li>Second</li></ul>'))).toBe('First.\nSecond')
  })
})
