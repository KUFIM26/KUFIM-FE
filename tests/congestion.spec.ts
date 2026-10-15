import { test, expect } from '@playwright/test'
import { mockApi } from './api-fixture'
import type { CongestionZone } from '../src/hooks/useCongestionApi'

async function setup(page: import('@playwright/test').Page) {
  await mockApi(page, { loggedIn: true })
  const zones: CongestionZone[] = [
    {
      zoneId: 1,
      stageId: 3,
      name: '메인무대 입장 대기열',
      displayOrder: 1,
      active: true,
      level: null,
      estimatedPeople: 100,
      updatedAt: '2026-10-15T13:00:00+09:00',
    },
    {
      zoneId: 2,
      stageId: 4,
      name: '서브무대 입장 대기열',
      displayOrder: 1,
      active: true,
      level: 'NORMAL',
      estimatedPeople: 50,
      updatedAt: null,
    },
  ]
  const state = { fail: false, saves: [] as unknown[] }
  const ok = (data: unknown) => ({ json: { success: true, data, error: null } })
  await page.route('**/api/v1/stages', (route) =>
    route.fulfill(
      ok([
        { stageId: 3, name: '메인 무대', displayOrder: 1, entryStatus: 'OPEN' },
        { stageId: 4, name: '서브 무대', displayOrder: 2, entryStatus: 'OPEN' },
      ]),
    ),
  )
  await page.route('**/api/v1/admin/stages/*/zones', (route) => {
    const stageId = Number(new URL(route.request().url()).pathname.split('/')[5])
    return route.fulfill(ok({ zones: zones.filter((z) => z.stageId === stageId) }))
  })
  await page.route('**/api/v1/admin/zones/*/congestion', async (route) => {
    expect(route.request().headers()['x-xsrf-token']).toBe('test-csrf')
    expect(route.request().method()).toBe('POST')
    if (state.fail)
      return route.fulfill({
        status: 500,
        json: { success: false, data: null, error: { message: '저장 실패' } },
      })
    const zoneId = Number(new URL(route.request().url()).pathname.split('/')[5])
    const input = route.request().postDataJSON()
    state.saves.push({ zoneId, ...input })
    const zone = zones.find((z) => z.zoneId === zoneId)!
    Object.assign(zone, input, { updatedAt: '2026-10-15T14:30:00+09:00' })
    await route.fulfill(ok(zone))
  })
  return state
}

test('menu, stage drafts, save, reload and cancel use the correct zone API', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin')
  await page.getByRole('link', { name: '혼잡도 관리' }).click()
  const input = page.getByRole('spinbutton')
  await expect(input).toHaveValue('100')
  await page.getByRole('button', { name: '메인무대 입장 대기열 50명 증가' }).click()
  await page.getByRole('button', { name: '혼잡', exact: true }).click()
  await page.getByRole('button', { name: '서브 무대', exact: true }).click()
  await expect(input).toHaveValue('50')
  await page.getByRole('button', { name: '메인 무대', exact: true }).click()
  await expect(input).toHaveValue('150')
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page.getByText('혼잡도를 저장했습니다.')).toBeVisible()
  expect(state.saves).toEqual([{ zoneId: 1, level: 'CROWDED', estimatedPeople: 150 }])
  await expect(page.getByText('2026.10.15. 14:30 기준')).toBeVisible()
  await page.reload()
  await expect(input).toHaveValue('150')
  await expect(page.getByRole('button', { name: '혼잡', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await input.fill('200')
  await page.getByRole('button', { name: '취소하기' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  expect(state.saves).toHaveLength(1)
})

test('validation, clamping and failed saves preserve entered data', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/congestion')
  const input = page.getByRole('spinbutton')
  await input.fill('10000')
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page.getByRole('alert')).toContainText('혼잡도를 선택')
  await page.getByRole('button', { name: '원활', exact: true }).click()
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page.getByRole('alert')).toContainText('0~9999')
  await input.fill('9980')
  await page.getByRole('button', { name: /50명 증가/ }).click()
  await expect(input).toHaveValue('9999')
  await input.fill('20')
  await page.getByRole('button', { name: /50명 감소/ }).click()
  await expect(input).toHaveValue('0')
  state.fail = true
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page.getByRole('alert')).toContainText('저장 실패')
  await expect(input).toHaveValue('0')
  state.fail = false
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page.getByText('혼잡도를 저장했습니다.')).toBeVisible()
  expect(state.saves).toEqual([{ zoneId: 1, level: 'SMOOTH', estimatedPeople: 0 }])
})

test('Figma screen fits mobile widths and uses local assets', async ({ page }) => {
  await setup(page)
  await page.goto('/admin/congestion')
  await expect(page.getByRole('spinbutton')).toHaveValue('100')
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: '../output/congestion-management.png', fullPage: true })
  for (const width of [320, 393, 768]) {
    await page.setViewportSize({ width, height: 898 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name: '취소하기' })).toBeInViewport()
  }
  const back = page.locator('header img')
  await expect(back).toHaveJSProperty('naturalWidth', 8)
})

test('home shows only the first stage congestion and refreshes without reloading', async ({
  page,
}) => {
  await mockApi(page)
  let level: string | null = 'SMOOTH'
  let reads = 0
  await page.route('**/api/v1/stages', (route) => {
    reads++
    return route.fulfill({
      json: {
        success: true,
        error: null,
        data: [
          {
            stageId: 4,
            name: '서브 무대',
            displayOrder: 2,
            entryStatus: 'RESTRICTED',
            zones: [{ zoneId: 2, displayOrder: 1, level: 'VERY_CROWDED' }],
          },
          {
            stageId: 3,
            name: '메인 무대',
            displayOrder: 1,
            entryStatus: 'OPEN',
            zones: [{ zoneId: 1, displayOrder: 1, level }],
          },
        ],
      },
    })
  })
  await page.clock.install()
  await page.goto('/')
  const status = page.getByText('무대 혼잡도', { exact: true }).locator('..').locator('strong')
  await expect(status).toHaveText('원활')
  const before = reads
  level = 'CROWDED'
  await page.clock.fastForward(15000)
  await expect(status).toHaveText('혼잡')
  expect(reads).toBeGreaterThan(before)
  level = null
  await page.clock.fastForward(15000)
  await expect(status).toHaveText('정보 없음')
})

test('only selected congestion keeps its color and saved selection restores after reload', async ({
  page,
}) => {
  await setup(page)
  await page.goto('/admin/congestion')
  const smooth = page.getByRole('button', { name: '원활', exact: true })
  const crowded = page.getByRole('button', { name: '혼잡', exact: true })
  await expect(smooth).toHaveCSS('background-color', 'rgb(158, 199, 233)')
  await crowded.click()
  await expect(smooth).toHaveCSS('background-color', 'rgb(207, 207, 207)')
  await expect(crowded).toHaveCSS('background-color', 'rgb(255, 216, 165)')
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page.getByText('혼잡도를 저장했습니다.')).toBeVisible()
  await page.reload()
  await expect(smooth).toHaveCSS('background-color', 'rgb(207, 207, 207)')
  await expect(crowded).toHaveCSS('background-color', 'rgb(255, 216, 165)')
})
