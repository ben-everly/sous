import type { Kitchen } from './types'

export const currentKitchen = (liveKitchens: Kitchen[]): Kitchen | null => liveKitchens[0] ?? null
