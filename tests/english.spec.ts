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
