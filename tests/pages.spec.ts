import { expect, test } from '@playwright/test'
import { screens } from '../src/data/screens'

for (const screen of screens) {
  test(`Figma ${screen.node}: ${screen.name}`, async ({ page }, testInfo) => {
    const errors: string[] = []
    const designHeight: Record<string, number> = {
      '17:4': 853,
      '17:303': 1701,
      '47:1047': 892,
      '108:481': 1433,
      '118:1217': 956,
      '118:1642': 956,
      '118:1412': 956,
    }
    await page.setViewportSize({ width: 393, height: designHeight[screen.node] || 898 })
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`)
    })
    await page.goto(screen.path)
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByText('화면을 불러오지 못했어요.')).toHaveCount(0)
    const images = await page.locator('img:visible').evaluateAll((nodes) =>
      nodes.map((node) => ({
        src: node.getAttribute('src'),
        loaded: node.complete && node.naturalWidth > 0,
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
        naturalWidth: node.naturalWidth,
        naturalHeight: node.naturalHeight,
      })),
    )
    for (const img of images) {
      expect(img.loaded, `Image failed: ${img.src}`).toBeTruthy()
      expect(img.width, `Zero width: ${img.src}`).toBeGreaterThan(0)
      expect(img.height, `Zero height: ${img.src}`).toBeGreaterThan(0)
      if (img.src?.endsWith('.svg'))
        expect(
          Math.abs(img.width / img.height - img.naturalWidth / img.naturalHeight),
          `Distorted SVG: ${img.src}`,
        ).toBeLessThan(0.15)
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy()
    expect(errors).toEqual([])
    await page.screenshot({
      path: testInfo.outputPath(`${screen.node.replace(':', '-')}.png`),
      fullPage: true,
    })
  })
}

test('navigation, day filters, category empty state, and mobile width', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '무대 일정', exact: true }).click()
  await expect(page).toHaveURL(/performances$/)
  await page.getByRole('button', { name: /DAY 2/ }).click()
  await expect(page).toHaveURL(/day=2/)
  await expect(page.getByText('NOW', { exact: true })).toHaveCount(0)
  await page.goto('/booths')
  await page.getByRole('button', { name: '동아리', exact: true }).click()
  await expect(page.getByText('해당하는 부스가 없어요.')).toBeVisible()
  await page.getByRole('button', { name: '시설', exact: true }).click()
  await expect(page.getByText('공학관 화장실', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
})

test('waiting registration validates input, creates a ticket, and supports cancel dialog', async ({
  page,
}) => {
  await page.goto('/waiting/register/booth-1')
  await page.getByLabel('학번', { exact: true }).fill('202300012')
  await page.getByLabel('전화번호', { exact: true }).fill('01012341234')
  await page.getByRole('button', { name: '웨이팅 접수하기' }).click()
  await expect(page).toHaveURL(/\/waiting$/)
  await expect(page.getByText('88번', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '웨이팅 취소하기', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '유지하기' }).click()
  await expect(page.getByText('88번', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '웨이팅 취소하기', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '취소하기', exact: true }).click()
  await expect(page.getByText('아직 신청한 웨이팅이 없어요.')).toBeVisible()
})

test('admin notice creation is reflected in the list and edit form', async ({ page }) => {
  await page.goto('/admin/notices/new')
  await page.getByRole('button', { name: '안내', exact: true }).click()
  await page.getByLabel('공지 제목', { exact: true }).fill('테스트 안내')
  await page.getByLabel('공지 내용', { exact: true }).fill('등록 화면 검증용 공지입니다.')
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await page.getByRole('link', { name: /테스트 안내/ }).click()
  await expect(page.getByLabel('공지 제목', { exact: true })).toHaveValue('테스트 안내')
})

test('admin queue cancellation and settings operate per booth', async ({ page }) => {
  await page.goto('/admin/waiting/booth-1')
  await page.getByRole('button', { name: '취소하기', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: '취소하기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '12번 | 3명' })).toHaveCount(0)
  await page.getByRole('link', { name: '부스 설정' }).click()
  await page.getByRole('button', { name: '대기 마감' }).click()
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await expect(page.getByText('대기 마감', { exact: true })).toBeVisible()
})

test('direct routes and desktop centered mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/admin/booths/new?period=facility')
  await expect(page.getByLabel('시설 명', { exact: true })).toBeVisible()
  await expect(page.locator('.app-shell')).toHaveCSS('max-width', '393px')
  await page.reload()
  await expect(page.getByLabel('시설 명', { exact: true })).toBeVisible()
  await page.goto('/notices/missing')
  await expect(page.getByText('404', { exact: true })).toBeVisible()
})
