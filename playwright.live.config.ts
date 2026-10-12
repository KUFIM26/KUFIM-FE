import { defineConfig } from '@playwright/test'

// Both servers and their throwaway H2 database belong to this test run.
export default defineConfig({
  testDir: './tests/live',
  outputDir: './test-results-live',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 393, height: 898 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'java -jar ../KUFIM-BE/build/libs/KUFIM-BE-0.0.1-SNAPSHOT.jar',
      url: 'http://127.0.0.1:18080/api/v1/status',
      timeout: 120000,
      reuseExistingServer: false,
      env: {
        SPRING_PROFILES_ACTIVE: 'local',
        SERVER_PORT: '18080',
        SPRING_DATASOURCE_URL:
          'jdbc:h2:mem:kufim-e2e;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1',
        KUFIM_ADMIN_LOGIN: 'e2e-admin',
        KUFIM_ADMIN_PASSWORD: 'throwaway-e2e-password',
        CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:4174',
        FRONTEND_BASE_URL: 'http://127.0.0.1:4174',
      },
    },
    {
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4174',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
      env: {
        VITE_USE_MOCK: 'false',
        API_PROXY_TARGET: 'http://127.0.0.1:18080',
        VITE_API_BASE_URL: '/api/v1',
      },
    },
  ],
})
