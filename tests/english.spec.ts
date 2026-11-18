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
