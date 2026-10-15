import { test, expect } from '@playwright/test'
import { mockApi, ticket } from './api-fixture'

test('Figma X-2, X-3 and X-4 geometry, controls and cancel flow', async ({ page }) => {
  const state = await mockApi(page, { loggedIn: true, active: true })
  Object.assign(state.tickets[0], { status: 'CALLED', calledAt: ticket.serverTime })
  await page.goto('/admin/waiting/7')
  await expect(page.getByText(/호출완료 \/ 호출한지/)).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByRole('button', { name: '호출하기', exact: true })).toHaveCSS(
    'height',
    '40px',
  )
  await expect(page.getByRole('button', { name: '전화하기', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '노쇼 처리', exact: true })).toHaveCount(0)
  await page.screenshot({ path: '../output/admin-x2-updated.png', fullPage: true })
  await page.getByRole('button', { name: '취소하기', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '웨이팅 취소하기' })
  await expect(dialog).toBeVisible()
  const box = (await dialog.boundingBox())!
  expect(box.width).toBe(353)
  expect(box.height).toBeCloseTo(137, 0)
  await page.screenshot({ path: '../output/admin-x4-updated.png', fullPage: true })
  await dialog.getByRole('button', { name: '유지하기' }).click()
  expect(state.tickets[0].status).toBe('CALLED')
  await page.getByRole('link', { name: '부스 설정' }).click()
  const qr = page.getByAltText('테스트 부스 웨이팅 접수 QR 코드')
  await expect(qr).toBeVisible()
  await expect(qr).toHaveCSS('width', '140px')
  await expect(qr).toHaveCSS('height', '140px')
  await page.screenshot({ path: '../output/admin-x3-updated.png', fullPage: true })
  const images = await page.locator('header img, main img').evaluateAll((elements) =>
    elements.map((element) => {
      const image = element as HTMLImageElement
      const box = image.getBoundingClientRect()
      return {
        src: image.getAttribute('src'),
        loaded: image.complete && image.naturalWidth > 0,
        width: box.width,
        height: box.height,
      }
    }),
  )
  expect(images.every((image) => image.loaded && image.width > 0 && image.height > 0)).toBe(true)
  for (const width of [320, 393]) {
    await page.setViewportSize({ width, height: 898 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name: '저장하기' })).toBeInViewport()
  }
  await page.goto('/admin/waiting/7')
  await page.getByRole('button', { name: '취소하기', exact: true }).click()
  await dialog.getByRole('button', { name: '취소하기', exact: true }).click()
  await expect(page.getByText('현재 대기 중인 팀이 없어요.')).toBeVisible()
  expect(state.tickets[0].status).toBe('CANCELED')
})
