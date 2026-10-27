import { expect, test } from '@playwright/test'
import { mockApi } from './api-fixture'

const bar = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: '주 메뉴' })

async function expectLensAligned(page: import('@playwright/test').Page) {
  await expect
    .poll(async () => {
      const active = await bar(page).locator('[aria-current="page"]').boundingBox()
      const lens = await bar(page).locator('.bottom-nav-selection').boundingBox()
      return active && lens ? Math.abs(lens.x - (active.x - 2)) : Infinity
    })
    .toBeLessThan(1)
}

test('one glass lens slides between routes and follows rapid taps, history and resize', async ({
  page,
}) => {
  await mockApi(page)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expectLensAligned(page)
  const lens = await bar(page).locator('.bottom-nav-selection').elementHandle()
  const initial = (await lens!.boundingBox())!.x
  await page.evaluate(() => {
    const lens = document.querySelector('.bottom-nav-selection')!
    const samples: number[] = []
    ;(window as unknown as { lensPositions: number[] }).lensPositions = samples
    const sample = (frames: number) => {
      samples.push(lens.getBoundingClientRect().x)
      if (frames > 0) requestAnimationFrame(() => sample(frames - 1))
    }
    requestAnimationFrame(() => sample(60))
  })
  await bar(page).getByRole('link', { name: '지도', exact: true }).click()
  await expect(page).toHaveURL('/map')
  // Navigation must not replace the lens or jump it directly to the destination.
  expect(await lens!.evaluate((element) => element.isConnected)).toBe(true)
  await expect(bar(page).getByRole('link', { name: '지도', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  const destination = (await bar(page).locator('[aria-current="page"]').boundingBox())!.x - 2
  await expectLensAligned(page)
  const samples = await page.evaluate(
    () => (window as unknown as { lensPositions: number[] }).lensPositions,
  )
  expect(samples.some((position) => position > initial + 1 && position < destination - 1)).toBe(
    true,
  )
  await bar(page).getByRole('link', { name: '웨이팅', exact: true }).click()
  await bar(page).getByRole('link', { name: '홈', exact: true }).click()
  await expectLensAligned(page)
  await page.goBack()
  await expect(page).toHaveURL('/waiting')
  await expect(bar(page).getByRole('link', { name: '웨이팅', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expectLensAligned(page)
  await page.setViewportSize({ width: 320, height: 640 })
  await expectLensAligned(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await bar(page).getByRole('link', { name: '전체 보기' }).click()
  await expect(page).toHaveURL('/menu')
  await expectLensAligned(page)
  await page.getByRole('link', { name: '이용 안내', exact: true }).click()
  await expect(bar(page)).toHaveCount(0)
  await page.goBack()
  await expect(bar(page)).toBeVisible()
  await expectLensAligned(page)
  expect(errors).toEqual([])
})

test('reduced motion changes selection immediately without a spring', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockApi(page)
  await page.goto('/')
  await bar(page).getByRole('link', { name: '웨이팅', exact: true }).click()
  await expect(page).toHaveURL('/waiting')
  const active = (await bar(page).locator('[aria-current="page"]').boundingBox())!
  const lens = (await bar(page).locator('.bottom-nav-selection').boundingBox())!
  expect(Math.abs(lens.x - (active.x - 2))).toBeLessThan(1)
})

test('admin navigation keeps its lens while catalog data reloads', async ({ page }) => {
  await mockApi(page, { loggedIn: true })
  await page.goto('/')
  await expectLensAligned(page)
  const lens = await bar(page).locator('.bottom-nav-selection').elementHandle()
  await bar(page).getByRole('link', { name: '전체 보기' }).click()
  await expect(page).toHaveURL('/admin')
  await expectLensAligned(page)
  expect(await lens!.evaluate((element) => element.isConnected)).toBe(true)
  await bar(page).getByRole('link', { name: '홈', exact: true }).click()
  await expectLensAligned(page)
})

test('a menu lookup error does not follow the persistent bar to another screen', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/')
  await page.route('**/api/v1/admin/auth/me', (route) => route.abort('failed'))
  await bar(page).getByRole('link', { name: '전체 보기' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await bar(page).getByRole('link', { name: '웨이팅', exact: true }).click()
  await expect(page).toHaveURL('/waiting')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
