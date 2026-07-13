const store = new Set<string>()

export const inFlight = {
  add: (key: string) => void store.add(key),
  has: (key: string) => store.has(key),
  delete: (key: string) => void store.delete(key),
}
