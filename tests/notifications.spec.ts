import { expect, test } from '@playwright/test'
import { mockApi } from './api-fixture'

test('notification rows match Figma and opening one marks only that item read', async ({
  page,
}, testInfo) => {
  const state = await mockApi(page)
  state.notices[0].category = 'TRAFFIC'
  state.notifications = [
    ...[6, 7, 8].map((notificationId) => ({
      ...state.notifications[0],
      notificationId,
      title: '주차장 혼잡 - 대중교통 이용 권장',
      createdAt: '2026-09-30T14:00:00+09:00',
      readAt: notificationId === 8 ? '2026-09-30T14:05:00+09:00' : null,
    })),
    {
      ...state.notifications[0],
      notificationId: 9,
      type: 'WAITING_CALL',
      noticeId: null,
      title: '“000” 부스에 입장하실 시간입니다.',
      createdAt: '2026-09-30T14:00:00+09:00',
      readAt: '2026-09-30T14:05:00+09:00',
    },
  ]
  await page.goto('/notifications')
  const list = page.getByRole('list', { name: '알림 목록' })
  await expect(list.locator('li')).toHaveCount(4)
  await expect(list.getByLabel('읽지 않음', { exact: true })).toHaveCount(2)
  await expect(list.getByText('09.30. 14:00', { exact: true })).toHaveCount(4)
  await expect(list.getByText('교통', { exact: true })).toHaveCount(2)
  await expect(page.getByRole('button', { name: '읽음 표시', exact: true })).toHaveCount(0)
  await expect(page.getByText('1 / 1', { exact: true })).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: testInfo.outputPath('notifications.png'), fullPage: true })
  for (const img of await list.locator('img').all()) {
    expect(
      await img.evaluate(
        (image: HTMLImageElement) =>
          image.complete &&
          image.naturalWidth === 18 &&
          image.getBoundingClientRect().width === 18 &&
          image.getBoundingClientRect().height === 18,
      ),
    ).toBe(true)
  }
  await list.getByRole('link').first().click()
  await expect(page).toHaveURL(/notices\/4$/)
  expect(state.notifications[0].readAt).not.toBeNull()
  expect(state.notifications[1].readAt).toBeNull()
  await page.goto('/notifications')
  await expect(page.getByLabel('읽지 않음', { exact: true })).toHaveCount(1)
})

test('failed read keeps the notification unread and stays on the list', async ({ page }) => {
  await mockApi(page)
  await page.route('**/api/v1/notifications/6/read', (route) =>
    route.fulfill({
      status: 503,
      json: { success: false, data: null, error: { code: 'C999', message: '읽음 처리 실패' } },
    }),
  )
  await page.goto('/notifications')
  await page.getByRole('list', { name: '알림 목록' }).getByRole('link').click()
  await expect(page.getByRole('alert')).toHaveText('읽음 처리 실패')
  await expect(page).toHaveURL(/notifications$/)
  await expect(page.getByLabel('읽지 않음', { exact: true })).toHaveCount(1)
})

test('direct entry and reload keep the Figma notification frame while the catalog loads', async ({
  page,
}) => {
  await mockApi(page)
  let release!: () => void
  let gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/v1/festival', async (route) => {
    await gate
    await route.fallback()
  })
  await page.goto('/notifications')
  const heading = page.getByRole('heading', { name: '알림함', exact: true })
  const main = page.locator('#main-content')
  const frame = () =>
    main.evaluate((element) => {
      const box = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        y: box.y,
        width: box.width,
        minHeight: style.minHeight,
        background: style.backgroundImage,
      }
    })
  await expect(heading).toBeVisible()
  await expect(page.getByRole('button', { name: '전체 읽음' })).toBeDisabled()
  await expect(page.getByText('불러오는 중…')).toBeVisible()
  const initial = await frame()
  expect(initial.y).toBe(62)
  expect(initial.width).toBe(393)
  release()
  await expect(page.getByRole('list', { name: '알림 목록' })).toBeVisible()
  expect(await frame()).toEqual(initial)
  await page.evaluate(() => document.fonts.ready)
  const direct = await page.screenshot()

  gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.reload()
  await expect(heading).toBeVisible()
  await expect(page.getByText('불러오는 중…')).toBeVisible()
  expect(await frame()).toEqual(initial)
  release()
  await expect(page.getByRole('list', { name: '알림 목록' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(await page.screenshot()).toEqual(direct)

  // A direct link must return home even without a prior in-app history entry.
  await page.getByRole('button', { name: '뒤로 가기' }).click()
  await expect(page).toHaveURL('/')
  await page.getByRole('link', { name: '알림함', exact: true }).click()
  await expect(page.getByRole('list', { name: '알림 목록' })).toBeVisible()
  expect(await frame()).toEqual(initial)
  await page.evaluate(() => document.fonts.ready)
  expect(await page.screenshot()).toEqual(direct)
})

test('catalog failure and retry keep the notification header and surface', async ({ page }) => {
  await mockApi(page)
  const fail = (route: import('@playwright/test').Route) => route.abort('failed')
  await page.route('**/api/v1/festival', fail)
  await page.goto('/notifications')
  await expect(page.getByRole('alert')).toContainText('서버에 연결하지 못했습니다')
  await expect(page.getByRole('heading', { name: '알림함', exact: true })).toBeVisible()
  await expect(page.locator('#main-content')).toHaveClass(/notifications-page/)
  await page.unroute('**/api/v1/festival', fail)
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await expect(page.getByRole('list', { name: '알림 목록' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
