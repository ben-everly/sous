// Exact matches only: five later-position steps repeat the canonical string verbatim and are
// kept, and two step-1 variants continue past the hand-washing into real instruction.
const BOILERPLATE = new Set([
  'Wash hands with soap and water.',
  'Wash hands with soap and water',
  'Wash your hands with soap and water.',
  'Wash hands well with soap and warm water.',
  'Wash hands with warm water and soap.',
  'Wash hands with soap and warm water.',
  'Wash hands with soap and watr.',
  'Adult and child: Wash hands with soap and water.',
])

export const isHandWashing = (step: string) => BOILERPLATE.has(step)
