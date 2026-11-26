export const KITCHEN_LIMIT = 'SC001'
export const SLOT_LIMIT = 'SC002'
export const DAY_LIMIT = 'SC003'

export const codeOf = (error: unknown) =>
  typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined
