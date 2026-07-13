import { afterEach, describe, expect, it } from 'vitest'
import { inFlight } from './in-flight'

afterEach(() => {
  inFlight.delete('kitchen:1')
  inFlight.delete('kitchen:2')
})

describe('inFlight', () => {
  it('is false before add, true after add, false after delete', () => {
    expect(inFlight.has('kitchen:1')).toBe(false)
    inFlight.add('kitchen:1')
    expect(inFlight.has('kitchen:1')).toBe(true)
    inFlight.delete('kitchen:1')
    expect(inFlight.has('kitchen:1')).toBe(false)
  })

  it('is idempotent when adding the same key twice', () => {
    inFlight.add('kitchen:1')
    inFlight.add('kitchen:1')
    expect(inFlight.has('kitchen:1')).toBe(true)
    inFlight.delete('kitchen:1')
    expect(inFlight.has('kitchen:1')).toBe(false)
  })

  it('shares state across independent imports', async () => {
    const other = await import('./in-flight')
    inFlight.add('kitchen:2')
    expect(other.inFlight.has('kitchen:2')).toBe(true)
    other.inFlight.delete('kitchen:2')
    expect(inFlight.has('kitchen:2')).toBe(false)
  })
})
