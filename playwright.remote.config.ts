import { defineConfig } from '@playwright/test'

// Read-only checks against the deployed backend. No content or waiting records are created.
export default defineConfig({
  testDir: './tests/remote',
  outputDir: './test-results-remote',
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://localhost:4176',
    viewport: { width: 393, height: 898 },
    // Authenticated traces may contain cookies. Keep them out of test artifacts.
    trace: 'off',
  },
  webServer: {
    command: 'npm run dev -- --host localhost --port 4176',
    url: 'http://localhost:4176',
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: '/api/v1',
      API_PROXY_TARGET: 'https://32-236-74-117.sslip.io',
    },
  },
})
