export function kitchenLabel(name: string | null, ownerDisplayName: string | null): string {
  if (name) return name
  if (ownerDisplayName) return `${ownerDisplayName}'s Kitchen`
  return 'My Kitchen'
}
