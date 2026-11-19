import { test, expect } from '@playwright/test'
import { mockApi } from './api-fixture'

const fits = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

test.describe('English device', () => {
  test.use({ locale: 'en-US' })

  test('first visit is English, and the choice survives a reload', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { name: 'Happening now' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'QR Waiting' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Main menu' })).toContainText('Home')
    expect(await fits(page)).toBe(true)
    await page.screenshot({ path: 'test-results/english-home.png', fullPage: true })

    await page.getByRole('button', { name: 'KO', exact: true }).click()
    await expect(page.getByRole('heading', { name: '현재 진행 중인 프로그램' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
    await page.reload()
    await expect(page.getByRole('heading', { name: '현재 진행 중인 프로그램' })).toBeVisible()
  })

  test('menu is English and narrow screens do not overflow', async ({ page }) => {
    await mockApi(page)
    await page.goto('/menu')
    await expect(page.getByRole('heading', { name: 'All menus' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Lost & Found' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Emergency report' })).toBeVisible()
    await page.screenshot({ path: 'test-results/english-menu.png', fullPage: true })
    for (const width of [320, 393]) {
      await page.setViewportSize({ width, height: 898 })
      expect(await fits(page)).toBe(true)
    }
    await page.goto('/')
    await page.setViewportSize({ width: 320, height: 898 })
    await expect(page.getByRole('link', { name: 'Schedule' })).toBeVisible()
    expect(await fits(page)).toBe(true)
  })

  test('booths, notices, shows and waiting screens are English', async ({ page }) => {
    await mockApi(page)
    await page.goto('/booths')
    await expect(page.getByRole('heading', { name: 'Booths', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Student Council' })).toBeVisible()
    await expect(page.getByText('Booths: 1')).toBeVisible()
    // 분류 값은 주소에 한국어 그대로 남고, 화면 글자만 영어다.
    await page.getByRole('button', { name: 'Clubs' }).click()
    await expect(page).toHaveURL(/category=%EB%8F%99%EC%95%84%EB%A6%AC/)
    await expect(page.getByText('No booths match.')).toBeVisible()
    expect(await fits(page)).toBe(true)
    await page.screenshot({ path: 'test-results/english-booths.png', fullPage: true })

    await page.goto('/notices')
    await expect(page.getByRole('heading', { name: 'Notices', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Safety' })).toBeVisible()
    await page.goto('/performances')
    await expect(page.getByRole('heading', { name: 'Stage schedule' })).toBeVisible()
    await page.goto('/notifications')
    await expect(page.getByRole('button', { name: 'Mark all read' })).toBeVisible()

    await page.goto('/waiting')
    await expect(page.getByRole('heading', { name: "You're not in any queue yet." })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Scan booth QR' })).toBeVisible()
    for (const width of [320, 393]) {
      await page.setViewportSize({ width, height: 898 })
      expect(await fits(page)).toBe(true)
    }
    await page.screenshot({ path: 'test-results/english-waiting.png', fullPage: true })
  })

  test('the map swaps to the English image and keeps Korean when switched back', async ({
    page,
  }) => {
    await mockApi(page)
    await page.route('**/api/v1/map', (route) =>
      route.fulfill({
        json: {
          success: true,
          data: { floorplan: { imageUrl: '/assets/map.svg', width: 218321, height: 223230 } },
          error: null,
        },
      }),
    )
    await page.goto('/map')
    const map = page.getByRole('img', { name: 'Festival map' })
    await expect(map).toHaveAttribute('src', '/assets/map_eng.svg')
    expect(await map.evaluate((img: HTMLImageElement) => img.naturalWidth > 0)).toBe(true)
    await expect(page.getByRole('button', { name: 'List view' })).toBeVisible()
    expect(await fits(page)).toBe(true)
    await page.screenshot({ path: 'test-results/english-map.png' })
    await page.goto('/')
    await page.getByRole('button', { name: 'KO', exact: true }).click()
    await page.goto('/map')
    await expect(page.getByRole('img', { name: '축제 지도' })).toHaveAttribute(
      'src',
      '/assets/map.svg',
    )
  })

  test('report and lost & found are English; server errors are shown by code', async ({ page }) => {
    await mockApi(page)
    const envelope = (data: unknown) => ({ json: { success: true, data, error: null } })
    await page.route('**/api/v1/reports/me', (route) => route.fulfill(envelope({ content: [] })))
    await page.route('**/api/v1/lost-items**', (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/lost-items/3'))
        return route.fulfill({
          status: 409,
          json: {
            success: false,
            data: null,
            error: { code: 'W001', message: '이미 활성 대기표가 있습니다.' },
          },
        })
      if (path.endsWith('/lost-items/4'))
        return route.fulfill({
          status: 400,
          json: { success: false, data: null, error: { code: 'X999', message: '알 수 없는 오류' } },
        })
      return route.fulfill(
        envelope({
          content: [
            {
              lostItemId: 1,
              category: 'ID_CARD',
              name: '김*국 학생증',
              status: 'STORED',
              createdAt: '2026-11-11T17:45:00+09:00',
              foundPlace: '대운동장',
              foundAt: '2026-11-11T17:40:00+09:00',
              storagePlace: '상황실',
              description: null,
              imageUrl: null,
              thumbnailUrl: null,
              elapsedMinutes: 180,
            },
          ],
          page: 0,
          totalPages: 1,
          totalElements: 1,
        }),
      )
    })
    await page.goto('/report')
    await expect(page.getByRole('link', { name: 'Call the control room' })).toBeVisible()
    await expect(page.getByText("You haven't submitted any reports yet.")).toBeVisible()
    await page.getByRole('button', { name: 'Progress' }).click()
    await expect(page.getByRole('dialog')).toContainText('Staff are taking action.')
    await expect(page.getByRole('dialog')).toContainText('In progress')
    await page.getByRole('button', { name: 'Close' }).click()
    await page.getByRole('link', { name: 'Submit report' }).click()
    await expect(page.getByRole('button', { name: 'Lost item' })).toBeVisible()
    await expect(page.getByPlaceholder('Enter a title (up to 30 characters)')).toBeVisible()
    for (const width of [320, 393]) {
      await page.setViewportSize({ width, height: 898 })
      expect(await fits(page)).toBe(true)
    }
    await page.screenshot({ path: 'test-results/english-report.png', fullPage: true })

    await page.goto('/lost-found')
    await expect(page.getByRole('heading', { name: 'Lost & Found' })).toBeVisible()
    await expect(page.getByText('Found items: 1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Wallet / Card' })).toBeVisible()
    await expect(page.getByText('3 hr ago')).toBeVisible()
    await expect(page.getByText('In storage', { exact: true })).toBeVisible()
    expect(await fits(page)).toBe(true)
    await page.screenshot({ path: 'test-results/english-lost.png', fullPage: true })

    // 아는 코드는 그 뜻의 영어 문구로, 모르는 코드는 일반 문구로 보여주고 한국어는 노출하지 않는다.
    await page.goto('/lost-found/3')
    await expect(page.getByRole('alert')).toHaveText("You're already in a queue.")
    await page.goto('/lost-found/4')
    await expect(page.getByRole('alert')).toHaveText("We couldn't process your request.")
    await expect(page.getByText('알 수 없는 오류')).toHaveCount(0)
  })

  test('admin screens stay Korean even when English is selected', async ({ page }) => {
    await mockApi(page, { loggedIn: true })
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: '관리자 메뉴' })).toBeVisible()
    await expect(page.getByRole('link', { name: '행사장 지도' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toHaveCount(0)
  })
})

test('Korean device starts in Korean and can switch to English from the menu', async ({ page }) => {
  await mockApi(page)
  await page.goto('/menu')
  await expect(page.getByRole('heading', { name: '전체 메뉴' })).toBeVisible()
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'All menus' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('kufim.lang'))).toBe('en')
})
