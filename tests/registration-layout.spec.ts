import { test, expect } from '@playwright/test'
import { mockApi } from './api-fixture'

test('registration sheet stays at the bottom and scrolls internally on small screens', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/waiting/register/7')
  const sheet = page.getByRole('region', { name: '웨이팅 접수' })
  const submit = page.getByRole('button', { name: '웨이팅 접수하기', exact: true })
  await expect(sheet).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  for (const size of [
    { width: 393, height: 898 },
    { width: 320, height: 568 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(size)
    await expect
      .poll(async () => {
        const box = (await sheet.boundingBox())!
        return Math.round(box.y + box.height)
      })
      .toBe(size.height)
    await expect(sheet).toHaveCSS('height', `${Math.min(615, size.height - 88)}px`)
    const box = (await sheet.boundingBox())!
    expect(box.width).toBe(Math.min(size.width, 393))
    await expect(submit).toBeInViewport()
    await page.getByLabel('동의합니다', { exact: true }).check()
    expect(await page.evaluate(() => scrollY)).toBe(0)
    await expect(submit).toBeInViewport()
  }
  await page.setViewportSize({ width: 393, height: 898 })
  await page.reload()
  await expect(sheet).toHaveCSS('height', '615px')
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: '../output/registration-fixed-bottom.png', fullPage: true })
  await page.getByRole('button', { name: '뒤로 가기' }).click()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})

test('keyboard viewport keeps input and submission visible without moving the document', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/waiting/register/7')
  const sheet = page.getByRole('region', { name: '웨이팅 접수' })
  await expect(sheet).toBeVisible()
  const phone = page.getByRole('textbox', { name: '전화번호', exact: true })
  await phone.focus()
  await page.evaluate(() => {
    Object.defineProperty(visualViewport!, 'height', { configurable: true, value: 500 })
    visualViewport!.dispatchEvent(new Event('resize'))
  })
  await expect
    .poll(async () => {
      const box = (await sheet.boundingBox())!
      return Math.round(box.y + box.height)
    })
    .toBe(500)
  const input = (await phone.boundingBox())!
  expect(input.y).toBeGreaterThanOrEqual(88)
  expect(input.y + input.height).toBeLessThanOrEqual(500)
  const submit = (await page
    .getByRole('button', { name: '웨이팅 접수하기', exact: true })
    .boundingBox())!
  expect(submit.y + submit.height).toBeLessThanOrEqual(500)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await page.evaluate(() => {
    Reflect.deleteProperty(visualViewport!, 'height')
    visualViewport!.dispatchEvent(new Event('resize'))
  })
  await expect
    .poll(async () => {
      const box = (await sheet.boundingBox())!
      return Math.round(box.y + box.height)
    })
    .toBe(898)
})
