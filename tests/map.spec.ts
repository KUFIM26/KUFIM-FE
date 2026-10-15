import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mockApi } from './api-fixture'

async function campusMap(page: Page) {
  const state = await mockApi(page, { loggedIn: true })
  await page.route('**/api/v1/map', (route) =>
    route.fulfill({
      json: {
        success: true,
        error: null,
        data: { floorplan: { imageUrl: '/assets/map.svg', width: 190936, height: 139672 } },
      },
    }),
  )
  await page.route('**/api/v1/map/pins', (route) =>
    route.fulfill({
      json: {
        success: true,
        error: null,
        data: [
          {
            pinId: 1,
            targetType: 'BOOTH',
            targetId: 7,
            name: '테스트 부스',
            xPercent: 40,
            yPercent: 50,
          },
        ],
      },
    }),
  )
  return state
}

test('campus SVG and booth anchor stay aligned through zoom and pan; dragging a pin does not open it', async ({
  page,
}) => {
  await campusMap(page)
  await page.goto('/map')
  const image = page.getByAltText('축제 지도', { exact: true })
  const pin = page.getByRole('link', { name: '테스트 부스 위치' })
  await expect(image).toHaveJSProperty('complete', true)
  await page.evaluate(() => document.fonts.ready)
  const normal = (await pin.boundingBox())!
  for (const zoom of [1, 1.4, 1.96]) {
    if (zoom > 1) await page.getByRole('button', { name: '지도 확대', exact: true }).click()
    const box = (await image.boundingBox())!,
      marker = (await pin.boundingBox())!
    expect(box.width / box.height).toBeCloseTo(190936 / 139672, 2)
    expect(marker.x + marker.width / 2).toBeCloseTo(box.x + box.width * 0.4, 0)
    expect(marker.y + marker.height).toBeCloseTo(box.y + box.height * 0.5, 0)
    expect(marker.width).toBeCloseTo(normal.width, 0)
  }
  const before = (await pin.boundingBox())!
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + before.width / 2 + 45, before.y + before.height / 2, {
    steps: 6,
  })
  await page.mouse.up()
  await expect(page).toHaveURL(/\/map$/)
  expect((await pin.boundingBox())!.x).toBeGreaterThan(before.x + 30)
  await page.getByRole('button', { name: '지도 전체 보기' }).click()
  await expect(page.getByRole('button', { name: '지도 축소', exact: true })).toBeDisabled()
  const viewport = page.getByRole('region', { name: '확대 가능한 축제 지도' })
  await viewport.hover()
  await page.mouse.wheel(0, -100)
  await expect(page.getByRole('button', { name: '지도 전체 보기' })).not.toHaveText('100%')
  await page.getByRole('button', { name: '지도 전체 보기' }).click()
  await pin.click()
  await expect(page).toHaveURL(/\/booths\/7$/)
})

test('zoomed admin selection saves image coordinates and cancelling does not change the saved location', async ({
  page,
}) => {
  const state = await campusMap(page)
  await page.goto('/admin/booths/7/edit')
  const open = page.getByRole('button', { name: '지도에서 위치 지정', exact: true })
  await open.click()
  let dialog = page.getByRole('dialog', { name: '부스 위치 지정' })
  await dialog.getByRole('button', { name: '지도 확대', exact: true }).click()
  await dialog.getByRole('button', { name: '지도 확대', exact: true }).click()
  let box = (await dialog.getByAltText('축제 지도', { exact: true }).boundingBox())!
  await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.65)
  await dialog.getByRole('button', { name: '취소하기', exact: true }).click()
  await open.click()
  dialog = page.getByRole('dialog', { name: '부스 위치 지정' })
  const selection = dialog.getByLabel('선택한 위치', { exact: true })
  expect(await selection.evaluate((el) => (el as HTMLElement).style.left)).toBe('40%')
  expect(await selection.evaluate((el) => (el as HTMLElement).style.top)).toBe('50%')
  await dialog.getByRole('button', { name: '지도 확대', exact: true }).click()
  await dialog.getByRole('button', { name: '지도 확대', exact: true }).click()
  box = (await dialog.getByAltText('축제 지도', { exact: true }).boundingBox())!
  await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.65)
  await dialog.getByRole('button', { name: '지정하기', exact: true }).click()
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/booths\?period=day$/)
  expect(state.booths[0].pin!.xPercent).toBeCloseTo(55, 1)
  expect(state.booths[0].pin!.yPercent).toBeCloseTo(65, 1)
})

test.describe('mobile campus map', () => {
  test.use({ hasTouch: true, isMobile: true })
  test('two-finger pinch zooms the map without zooming the page', async ({ page }) => {
    await campusMap(page)
    await page.goto('/map')
    const viewport = page.getByRole('region', { name: '확대 가능한 축제 지도' })
    await expect(viewport).toBeVisible()
    const box = (await viewport.boundingBox())!,
      x = box.x + box.width / 2,
      y = box.y + box.height / 2
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: x - 40, y, id: 0 },
        { x: x + 40, y, id: 1 },
      ],
    })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: x - 80, y, id: 0 },
        { x: x + 80, y, id: 1 },
      ],
    })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.getByRole('button', { name: '지도 전체 보기' })).toHaveText('200%')
    expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1)
    await page.getByRole('button', { name: '지도 전체 보기' }).tap()
    await expect(page.getByRole('button', { name: '지도 전체 보기' })).toHaveText('100%')
  })
})
