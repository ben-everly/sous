import { defineConfig, devices } from '@playwright/test'

// Load .env for local runs. In CI the file is absent and these come from the
// job env, so a missing file is fine.
try {
  process.loadEnvFile('.env')
} catch {
  // No .env — rely on the ambient environment (CI).
}

const authFile = 'e2e/.auth/user.json'

// Default to 3000; override with PORT when it's taken by another local service.
const port = process.env.PORT ?? '3000'
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: authFile },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: process.env.CI
      ? `npm run build && npm run start -- -p ${port}`
      : `npm run dev -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
