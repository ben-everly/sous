import type { Kitchen } from './types'

// Expects useKitchens' live list, already in the kitchens page's order.
export const currentKitchen = (kitchens: Kitchen[]): Kitchen | null => kitchens[0] ?? null
