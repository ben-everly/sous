import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { test as setup } from '@playwright/test'
import { TEST_USER } from './test-user'
import { createSignedInUser } from './users'

const authFile = 'e2e/.auth/user.json'

setup('authenticate', async ({ browser }) => {
  const { storageState } = await createSignedInUser(browser, TEST_USER.email)
  await mkdir(dirname(authFile), { recursive: true })
  await writeFile(authFile, JSON.stringify(storageState))
})
