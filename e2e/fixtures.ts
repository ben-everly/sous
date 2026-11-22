import { test as base, expect } from '@playwright/test'
import { createSignedInUser, deleteUser, type StorageState } from './users'

type SignedInUser = { id: string; email: string; storageState: StorageState }

export const test = base.extend<
  {
    createUser: (role?: string) => Promise<SignedInUser>
    isolatedUser: boolean
  },
  { workerUser: SignedInUser }
>({
  workerUser: [
    async ({ browser }, use, workerInfo) => {
      const user = await createSignedInUser(
        browser,
        `e2e-${workerInfo.parallelIndex}@example.com`,
        workerInfo.project.use.baseURL!,
      )
      await use(user)
      await deleteUser(user.id)
    },
    { scope: 'worker' },
  ],
  createUser: async ({ browser, baseURL }, provide, testInfo) => {
    const created: SignedInUser[] = []
    await provide(async (role = 'user') => {
      const random = crypto.randomUUID().slice(0, 8)
      const user = await createSignedInUser(
        browser,
        `e2e-${role}-${testInfo.parallelIndex}-${random}@example.com`,
        baseURL!,
      )
      created.push(user)
      return user
    })
    await Promise.all(created.map((u) => deleteUser(u.id)))
  },
  isolatedUser: [false, { option: true }],
  storageState: async ({ workerUser, isolatedUser, createUser }, provide) => {
    await provide((isolatedUser ? await createUser() : workerUser).storageState)
  },
})
export { expect }
