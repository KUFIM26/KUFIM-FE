import { expect, test } from '@playwright/test'
import { mockApi } from './api-fixture'

for (const role of ['SUPER_ADMIN', 'BOOTH_ADMIN'] as const) {
  test(`${role} restores its session from home and can return home from the admin menu`, async ({
    page,
  }) => {
    await mockApi(page, { loggedIn: true, role })
    await page.goto('/')
    await page.reload()
    const nav = page.getByRole('navigation', { name: '주 메뉴' })
    await nav.getByRole('link', { name: '전체 보기' }).click()
    await expect(page).toHaveURL('/admin')
    await expect(page.getByRole('heading', { name: '관리자 메뉴' })).toBeVisible()
    await expect(nav.getByRole('link', { name: '전체 보기' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    if (role === 'BOOTH_ADMIN') {
      await expect(page.getByRole('link', { name: '부스 프로그램 관리' })).toHaveCount(0)
    }
    await nav.getByRole('link', { name: '홈', exact: true }).click()
    await expect(page).toHaveURL('/')
    await nav.getByRole('link', { name: '전체 보기' }).click()
    await expect(page).toHaveURL('/admin')
  })
}

test('a visitor opens the public menu', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('navigation').getByRole('link', { name: '전체 보기' }).click()
  await expect(page).toHaveURL('/menu')
  await expect(page.getByRole('heading', { name: '전체 메뉴' })).toBeVisible()
})

for (const path of ['/', '/admin']) {
  test(`expired session opens the public menu from ${path}`, async ({ page }) => {
    const state = await mockApi(page, { loggedIn: true })
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: '관리자 메뉴' })).toBeVisible()
    if (path === '/') {
      await page.getByRole('navigation').getByRole('link', { name: '홈', exact: true }).click()
    }
    state.loggedIn = false
    await page.getByRole('navigation').getByRole('link', { name: '전체 보기' }).click()
    await expect(page).toHaveURL('/menu')
  })
}

for (const path of ['/', '/admin']) {
  test(`session lookup failure stays on ${path} and offers retry`, async ({ page }) => {
    await mockApi(page, { loggedIn: true })
    await page.goto(path)
    await expect(page.getByRole('navigation')).toBeVisible()
    if (path === '/admin') {
      await expect(page.getByRole('heading', { name: '관리자 메뉴' })).toBeVisible()
    }
    await page.route('**/api/v1/admin/auth/me', (route) => route.abort('failed'))
    await page.getByRole('navigation').getByRole('link', { name: '전체 보기' }).click()
    await expect(page.getByRole('alert')).toContainText('서버에 연결하지 못했습니다')
    await expect(page).toHaveURL(path)
    await page.unroute('**/api/v1/admin/auth/me')
    await page.getByRole('button', { name: '다시 시도', exact: true }).click()
    await expect(page).toHaveURL('/admin')
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
}

test('an authenticated visit to the login page also goes home', async ({ page }) => {
  await mockApi(page, { loggedIn: true })
  await page.goto('/admin/login?next=/admin/notices/new')
  await expect(page).toHaveURL('/')
})
