import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { booth, mockApi } from './api-fixture'

const validImage = `data:image/png;base64,${readFileSync('tests/fixtures/booth-qr.png').toString('base64')}`
const invalidImage = `data:image/png;base64,${readFileSync('tests/fixtures/invalid-qr.png').toString('base64')}`
const registrationImage = `data:image/png;base64,${readFileSync('tests/fixtures/registration-qr.png').toString('base64')}`
async function camera(page: Page, image = '', denied = false) {
  await mockApi(page)
  await page.addInitScript(
    ({ image, denied }) => {
      // Exercise the real worker decoder, including browsers without BarcodeDetector.
      Reflect.deleteProperty(window, 'BarcodeDetector')
      const state = { image, denied, requests: 0, streams: [] as MediaStream[] }
      Object.assign(window, { testCamera: state })
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: async () => {
          state.requests++
          if (state.denied) throw new DOMException('Denied', 'NotAllowedError')
          const canvas = document.createElement('canvas')
          canvas.width = 393
          canvas.height = 830
          const context = canvas.getContext('2d')!
          let source = ''
          const qr = new Image()
          const draw = () => {
            if (source !== state.image) {
              source = state.image
              qr.src = source
            }
            context.fillStyle = '#000'
            context.fillRect(0, 0, 393, 830)
            if (qr.complete && qr.naturalWidth) context.drawImage(qr, 68, 233, 258, 258)
          }
          draw()
          const timer = setInterval(draw, 50)
          const stream = canvas.captureStream(15)
          state.streams.push(stream)
          stream.getTracks().forEach((track) => {
            const stop = track.stop.bind(track)
            track.stop = () => {
              clearInterval(timer)
              stop()
            }
          })
          return stream
        },
      })
    },
    { image, denied },
  )
}

async function showImage(page: Page, image: string) {
  await page.evaluate((image) => {
    ;(window as unknown as { testCamera: { image: string } }).testCamera.image = image
  }, image)
}

async function streamsStopped(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { testCamera: { streams: MediaStream[] } }).testCamera.streams.every(
          (stream) => stream.getTracks().every((track) => track.readyState === 'ended'),
        ),
      ),
    )
    .toBe(true)
}

test('real QR image opens its booth registration once and releases camera', async ({ page }) => {
  await camera(page, validImage)
  let lookups = 0
  page.on('request', (request) => {
    if (request.url().includes('/booths/code/')) lookups++
  })
  await page.goto('/waiting/scan')
  await expect(page).toHaveURL(/\/waiting\/register\/7$/, { timeout: 15000 })
  expect(lookups).toBe(1)
  await streamsStopped(page)
})

test('existing direct registration QR validates booth 5 and opens registration', async ({
  page,
}) => {
  await camera(page, registrationImage)
  let exists = false
  await page.route('**/api/v1/booths/5', (route) =>
    route.fulfill(
      exists
        ? { json: { success: true, error: null, data: { ...booth, boothId: 5 } } }
        : {
            status: 404,
            json: {
              success: false,
              data: null,
              error: { code: 'B002', message: '부스를 찾을 수 없습니다.' },
            },
          },
    ),
  )
  await page.route('**/api/v1/booths/5/waiting-status', (route) =>
    route.fulfill({
      json: {
        success: true,
        error: null,
        data: {
          boothId: 5,
          waitingEnabled: true,
          acceptingStatus: 'OPEN',
          effectiveWaitingStatus: 'OPEN',
          waitingTeamCount: 0,
          estimatedWaitMinutes: 0,
          myActiveWaitingId: null,
        },
      },
    }),
  )
  await page.goto('/waiting/scan')
  const dialog = page.getByRole('dialog', { name: 'QR 코드 확인' })
  await expect(dialog).toContainText('부스를 찾을 수 없습니다.', { timeout: 15000 })
  await expect(page).toHaveURL(/\/waiting\/scan$/)
  exists = true
  await dialog.getByRole('button', { name: '다시 스캔하기' }).click()
  await expect(page).toHaveURL(/\/waiting\/register\/5$/, { timeout: 15000 })
  await expect(page.getByRole('heading', { name: booth.name, exact: true })).toBeVisible()
  await streamsStopped(page)
})

test('foreign QR pauses at a popup and can resume scanning a valid QR', async ({ page }) => {
  await camera(page, invalidImage)
  await page.goto('/waiting/scan')
  const dialog = page.getByRole('dialog', { name: 'QR 코드 확인' })
  await expect(dialog).toBeVisible({ timeout: 15000 })
  await expect(dialog).toContainText('이 축제의 부스 QR 코드가 아닙니다.')
  await expect(page).toHaveURL(/\/waiting\/scan$/)
  await page.screenshot({ path: '../output/qr-scanner-invalid.png', fullPage: true })
  await showImage(page, validImage)
  await dialog.getByRole('button', { name: '다시 스캔하기' }).click()
  await expect(page).toHaveURL(/\/waiting\/register\/7$/, { timeout: 15000 })
  await streamsStopped(page)
})

test('invalid booth and API errors allow a new scan without repeat requests', async ({ page }) => {
  await camera(page, validImage)
  let fail = true,
    reads = 0
  await page.route('**/api/v1/booths/code/live-code', (route) => {
    reads++
    if (!fail) return route.fallback()
    return route.fulfill({
      status: 404,
      json: {
        success: false,
        data: null,
        error: { code: 'B002', message: '유효하지 않은 QR 코드입니다.' },
      },
    })
  })
  await page.goto('/waiting/scan')
  const dialog = page.getByRole('dialog', { name: 'QR 코드 확인' })
  await expect(dialog).toBeVisible({ timeout: 15000 })
  expect(reads).toBe(1)
  fail = false
  await dialog.getByRole('button', { name: '다시 스캔하기' }).click()
  await expect(page).toHaveURL(/\/waiting\/register\/7$/, { timeout: 15000 })
  expect(reads).toBe(2)
})

test('Figma camera frame and return button release the stream; permission denial can retry', async ({
  page,
}) => {
  await camera(page)
  await page.goto('/waiting/scan')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { testCamera: { streams: MediaStream[] } }).testCamera.streams
            .length,
      ),
    )
    .toBeGreaterThan(0)
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByRole('img', { name: 'QR 인식 영역' })).toHaveCSS(
    'border-top-style',
    'solid',
  )
  await expect(page.getByRole('img', { name: 'QR 인식 영역' })).toHaveCSS(
    'border-top-color',
    'rgb(255, 255, 255)',
  )
  await page.screenshot({ path: '../output/qr-scanner-camera.png', fullPage: true })
  await page.getByRole('link', { name: '돌아가기', exact: true }).click()
  await expect(page).toHaveURL(/\/waiting$/)
  await streamsStopped(page)
  await page.evaluate(() => {
    ;(window as unknown as { testCamera: { denied: boolean } }).testCamera.denied = true
  })
  await page.getByRole('link', { name: '부스 QR 스캔하기', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('카메라 권한이 필요합니다.')
  await page.evaluate(() => {
    ;(window as unknown as { testCamera: { denied: boolean } }).testCamera.denied = false
  })
  await page.getByRole('button', { name: '카메라 다시 시도' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await showImage(page, validImage)
  await expect(page).toHaveURL(/\/waiting\/register\/7$/, { timeout: 15000 })
})
