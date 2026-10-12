import { expect, test } from '@playwright/test'

// No API interception: requests to a backend must never leave the browser.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', () => {
    throw new Error('Mock mode attempted a backend request')
  })
})
async function login(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByLabel('아이디', { exact: true }).fill('admin')
  await page.getByLabel('비밀번호', { exact: true }).fill('demo1234')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
test('all visitor screens work without a backend', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  for (const path of [
    '/',
    '/map',
    '/booths',
    '/booths/1',
    '/booths/facility-1',
    '/performances',
    '/performances/1',
    '/notices',
    '/notices/1',
    '/notifications',
    '/waiting',
  ]) {
    await page.goto(path)
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByText('불러오는 중…')).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})
test('registration survives reload, admin calls and enters, notification read persists', async ({
  page,
}) => {
  await page.goto('/w/mock-1')
  await expect(page).toHaveURL(/waiting\/register\/1$/)
  await page.getByLabel('학번', { exact: true }).fill('202300012')
  await page.getByLabel('전화번호', { exact: true }).fill('01012341234')
  await page.getByRole('combobox', { name: '인원 수' }).selectOption('2')
  await page.getByLabel('동의합니다', { exact: true }).check()
  await page.getByRole('button', { name: '웨이팅 접수하기' }).click()
  await expect(page).toHaveURL(/\/waiting$/)
  await page.reload()
  await expect(page.getByText('1번', { exact: true })).toBeVisible()
  const saved = await page.evaluate(() => localStorage.getItem('kufim.mock.v1'))
  expect(saved).not.toContain('202300012')
  expect(saved).not.toContain('01012341234')
  await login(page)
  await page.goto('/admin/waiting/1')
  await page.getByRole('button', { name: '호출하기', exact: true }).click()
  await expect(page.getByRole('button', { name: '재호출', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '입장 완료', exact: true }).click()
  await expect(page.getByText('현재 대기 중인 팀이 없어요.')).toBeVisible()
  await page.goto('/notifications')
  await expect(page.getByText('입장할 차례예요!')).toBeVisible()
  await page.getByRole('button', { name: '전체 읽음' }).click()
  await page.reload()
  await expect(page.getByText('읽지 않은 알림 0개')).toBeVisible()
})
test('admin saves content and waiting settings across reloads', async ({ page }) => {
  await login(page)
  await page.goto('/admin/notices/new')
  await page.getByRole('button', { name: '안내', exact: true }).click()
  await page.getByLabel('공지 제목', { exact: true }).fill('목업 저장 확인')
  await page
    .getByRole('textbox', { name: '공지 내용', exact: true })
    .fill('새로고침 후에도 유지되는 내용')
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await expect(page).toHaveURL(/admin\/notices$/)
  await page.reload()
  await page.getByRole('link', { name: /목업 저장 확인/ }).click()
  await expect(page.getByRole('textbox', { name: '공지 내용', exact: true })).toHaveValue(
    '새로고침 후에도 유지되는 내용',
  )
  await page.goto('/admin/waiting/1/settings')
  await expect(page.getByRole('link', { name: '이 부스 웨이팅 접수하기' })).toBeVisible()
  await page.getByRole('button', { name: '대기 마감', exact: true }).click()
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await expect(page).toHaveURL(/admin\/waiting\/1$/)
  await page.reload()
  await expect(page.getByText('대기 마감', { exact: true })).toBeVisible()
  await page.goto('/waiting/register/1')
  await expect(page.getByRole('button', { name: '웨이팅 접수하기' })).toBeDisabled()
})
