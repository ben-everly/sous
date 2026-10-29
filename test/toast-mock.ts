import { vi } from 'vitest'

// Backs __mocks__/sonner.ts. sonner's toast is both a function (the undo toast) and an object with .error.
export const mockToast = Object.assign(vi.fn(), { error: vi.fn() })
