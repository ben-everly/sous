import { test as base, expect } from '@playwright/test'
import { createSignedInUser, deleteUser, type StorageState } from './users'

export const test = base.extend<
  object,
  { workerUser: { id: string; email: string; storageState: StorageState } }
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
  storageState: async ({ workerUser }, provide) => {
    await provide(workerUser.storageState)
  },
})
export { expect }
