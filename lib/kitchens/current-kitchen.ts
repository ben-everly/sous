import type { Kitchen } from './types'

// Matches the DB's order so a restored kitchen lands back in its original slot, not at the end.
const byCreatedThenId = (a: Kitchen, b: Kitchen) =>
  a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)

export const liveKitchens = (rows: Kitchen[]): Kitchen[] =>
  rows.filter((k) => !k.deleted_at).sort(byCreatedThenId)

export const currentKitchen = (live: Kitchen[]): Kitchen | null => live[0] ?? null
