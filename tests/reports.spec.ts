import { test, expect } from '@playwright/test'
import { mockApi } from './api-fixture'
import type { Report } from '../src/apis/report'

async function reports(page: import('@playwright/test').Page, admin = false) {
  await mockApi(page, { loggedIn: admin })
  const item: Report = {
    reportId: 1,
    category: 'OTHER',
    title: '공연장 내부가 너무 답답해요',
    reporterName: '김건국',
    place: '청심대 인근',
    content: '공연장 내부에 사람이 너무 많아요.\n뒤로 사람들을 보내주세요.',
    status: 'SUBMITTED',
    createdAt: '2026-09-30T14:00:00+09:00',
    receivedAt: null,
    inProgressAt: null,
    completedAt: null,
    adminNote: null,
    phoneNumberMasked: '010-****-0000',
  }
  const calls: string[] = []
  await page.route('**/api/v1/**reports**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    calls.push(`${method} ${path}`)
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data, error: null } })
    if (path.endsWith('/contact')) return ok({ phoneNumber: '01000000000' })
    if (path.endsWith('/receive')) {
      expect(method).toBe('POST')
      item.status = 'RECEIVED'
      item.receivedAt = item.createdAt
      return ok({ ...item, smsStatus: 'NOT_CONFIGURED' })
    }
    if (path.endsWith('/memo') || path.endsWith('/complete')) {
      expect(method).toBe(path.endsWith('/memo') ? 'PUT' : 'POST')
      item.adminNote = request.postDataJSON().adminNote
      item.status = path.endsWith('/memo') ? 'IN_PROGRESS' : 'COMPLETED'
      item.inProgressAt = item.createdAt
      return ok(item)
    }
    if (method === 'DELETE') {
      item.status = 'CANCELED'
      return route.fulfill({ status: 204 })
    }
    if (method === 'POST') {
      Object.assign(item, request.postDataJSON())
      return ok(item)
    }
    if (path.endsWith('/me')) return ok({ content: [item] })
    if (path.endsWith('/admin/reports'))
      return ok({
        content: [item],
        summary: { submitted: 1, received: 0, inProgress: 0, completed: 0, canceled: 0 },
        page: 0,
        totalPages: 1,
        totalElements: 1,
      })
    return ok(item)
  })
  return { item, calls }
}
async function assets(page: import('@playwright/test').Page) {
  await page.evaluate(() => document.fonts.ready)
  const images = await page.locator('header img, main img').evaluateAll((elements) =>
    elements.map((e) => {
      const image = e as HTMLImageElement
      const box = e.getBoundingClientRect()
      return {
        loaded: image.complete && image.naturalWidth > 0,
        width: box.width,
        height: box.height,
      }
    }),
  )
  expect(images.every((i) => i.loaded && i.width > 0 && i.height > 0)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

test('E screens: submission, stop dialog, detail and cancellation', async ({ page }) => {
  const { item, calls } = await reports(page)
  await page.goto('/report')
  await expect(page.getByText(item.title)).toBeVisible()
  await assets(page)
  await page.screenshot({ path: 'test-results/report-e1.png', fullPage: true })
  await page.getByRole('link', { name: '신고하기', exact: true }).click()
  await page.getByPlaceholder('신고 제목을 입력하세요.(30자 이내)').fill('시설 신고')
  await page.getByPlaceholder('신고자 성함을 입력하세요.(10자 이내)').fill('김건국')
  await page.getByPlaceholder('신고자 연락처를 입력하세요.(11자 이내)').fill('010-0000-0000')
  await page.getByPlaceholder('발생 장소를 입력하세요.(최대한 구체적으로)').fill('청심대')
  await page
    .getByPlaceholder('신고 내용을 입력하세요. (300자 이내)')
    .fill('시설 확인을 부탁드립니다.')
  await page.getByRole('checkbox').check()
  await assets(page)
  await page.screenshot({ path: 'test-results/report-e2.png', fullPage: true })
  await page.getByRole('button', { name: '취소하기', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '돌아가기' }).click()
  await page.getByRole('button', { name: '신고하기', exact: true }).click()
  await expect(page).toHaveURL(/\/report\/1$/)
  await expect(page.getByRole('heading', { name: '시설 신고' })).toBeVisible()
  expect(calls).toContain('POST /api/v1/reports')
  await assets(page)
  await page.screenshot({ path: 'test-results/report-e3.png', fullPage: true })
  await page.getByRole('button', { name: '신고 취소', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '신고 취소', exact: true }).click()
  await expect(page.getByRole('button', { name: '신고 취소', exact: true })).toHaveCount(0)
  expect(item.status).toBe('CANCELED')
})

test('W screens: receive once, protected contact, memo and completion', async ({ page }) => {
  const { item, calls } = await reports(page, true)
  await page.goto('/admin/reports')
  await expect(page.getByText(item.title)).toBeVisible()
  await assets(page)
  await page.screenshot({ path: 'test-results/report-w1.png', fullPage: true })
  await page.getByRole('link', { name: new RegExp(item.title) }).click()
  await expect(page.getByText('신고를 접수했습니다.', { exact: false })).toBeVisible()
  expect(calls.filter((c) => c.endsWith('/receive'))).toHaveLength(1)
  await expect(page.getByText('01000000000', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '연락처 보기' }).click()
  await expect(page.getByRole('button', { name: '01000000000' })).toBeVisible()
  await page.getByPlaceholder('신고 처리 경과를 입력하세요.').fill('현장 확인 중입니다.')
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page.getByText('처리 내용을 저장했습니다.')).toBeVisible()
  expect(item.status).toBe('IN_PROGRESS')
  await assets(page)
  await page.screenshot({ path: 'test-results/report-w2.png', fullPage: true })
  for (const width of [320, 393]) {
    await page.setViewportSize({ width, height: 898 })
    await assets(page)
    await expect(page.getByRole('button', { name: '저장하기' })).toBeInViewport()
  }
  await page.getByRole('button', { name: '완료 처리', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '완료 처리', exact: true }).click()
  await expect(page.getByPlaceholder('신고 처리 경과를 입력하세요.')).toBeDisabled()
  expect(item.status).toBe('COMPLETED')
})
