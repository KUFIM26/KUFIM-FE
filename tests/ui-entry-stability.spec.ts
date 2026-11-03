import { expect, test } from '@playwright/test'
import { mockApi } from './api-fixture'

for (const path of ['/', '/notifications', '/map', '/waiting', '/menu']) {
  test(`compare settled UI for ${path} between navigation and reload`, async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '서버 축제' })).toBeVisible()
    if (path === '/notifications')
      await page.getByRole('link', { name: '알림함', exact: true }).click()
    else if (path !== '/') await page.getByRole('navigation').locator(`a[href="${path}"]`).click()
    await expect(page).toHaveURL(path)
    const title = (
      {
        '/': '서버 축제',
        '/notifications': '알림함',
        '/map': '축제 지도',
        '/waiting': 'QR 웨이팅',
        '/menu': '전체 메뉴',
      } as Record<string, string>
    )[path]
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByText('불러오는 중…')).toHaveCount(0)
    await page.evaluate(() => document.fonts.ready)
    const signature = () =>
      page.evaluate(() =>
        [
          ...document.querySelectorAll(
            'body, .app-shell, header, h1, #main-content, .page-pad, .card, h2',
          ),
        ].map((el) => {
          const css = getComputedStyle(el)
          const box = el.getBoundingClientRect()
          return {
            tag: el.tagName,
            text: el.matches('h1,h2') ? el.textContent : '',
            width: box.width,
            height: box.height,
            x: box.x,
            y: box.y,
            font: css.font,
            background: css.background,
            padding: css.padding,
            margin: css.margin,
          }
        }),
      )
    const before = await signature()
    await page.reload()
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByText('불러오는 중…')).toHaveCount(0)
    await page.evaluate(() => document.fonts.ready)
    expect(await signature()).toEqual(before)
  })
}
