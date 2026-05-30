import { defineConfig, devices } from '@playwright/test'

// Load .env.local for local runs (NEXT_PUBLIC_* + SUPABASE_SECRET_KEY used by
// the auth setup project). In CI the file is absent and these come from the job
// env, so a missing file is fine.
try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local — rely on the ambient environment (CI).
}

const authFile = 'e2e/.auth/user.json'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
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
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
