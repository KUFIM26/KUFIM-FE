import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/live/**', '**/remote/**'],
  fullyParallel: true,
  workers: 3,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // 기존 테스트는 한국어 화면 기준이다. 영어는 tests/english.spec.ts에서 따로 확인한다.
    locale: 'ko-KR',
    viewport: { width: 393, height: 898 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
})
