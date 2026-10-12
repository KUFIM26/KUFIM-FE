import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/mock',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    viewport: { width: 393, height: 898 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    env: { VITE_USE_MOCK: 'true' },
  },
})
