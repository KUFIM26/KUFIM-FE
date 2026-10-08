import { defineConfig } from '@playwright/test'

const use = { viewport: { width: 393, height: 898 }, trace: 'retain-on-failure' } as const

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 3,
  projects: [
    // In-memory Figma demo data.
    {
      name: 'mock',
      testIgnore: /api\.spec\.ts/,
      use: { ...use, baseURL: 'http://127.0.0.1:4173' },
    },
    // Backend mode. Tests answer /api/v1 in the browser with responses shaped like KUFIM-BE.
    {
      name: 'api',
      testMatch: /api\.spec\.ts/,
      use: { ...use, baseURL: 'http://127.0.0.1:4174' },
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
    },
    {
      command:
        'npx vite build --outDir dist-api && npx vite preview --outDir dist-api --host 127.0.0.1 --port 4174',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: true,
      env: { VITE_DATA_SOURCE: 'api' },
    },
  ],
})
