import { expect, test } from '@playwright/test'
import { mockApi } from './api-fixture'

for (const path of [
  '/',
  '/map',
  '/booths',
  '/booths/facility-7',
  '/booths/7',
  '/performances',
  '/performances/9',
  '/notices',
  '/notices/4',
  '/notifications',
  '/waiting',
  '/waiting/scan',
  '/waiting/register/7',
  '/admin',
  '/admin/booths',
  '/admin/booths/7/edit',
  '/admin/booths/facility-7/edit',
  '/admin/notices/new',
  '/admin/performances/9/edit',
  '/admin/waiting/7',
  '/admin/waiting/7/settings',
]) {
  test(`API screen ${path}`, async ({ page }) => {
    await mockApi(page, { loggedIn: true })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(path)
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByText('불러오는 중…')).toHaveCount(0)
    expect(errors).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('server data, actual festival days and detail fields replace mock content', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '서버 축제' })).toBeVisible()
  await expect(page.getByText('65개')).toHaveCount(0)
  await page.goto('/performances')
  await expect(page.getByRole('button', { name: /DAY 3/ })).toBeVisible()
  await page.getByRole('link', { name: /서버 밴드/ }).click()
  await expect(page.getByText('서버 공연 소개')).toBeVisible()
  await page.goto('/booths/facility-7')
  await expect(page.getByRole('heading', { name: '공학관 화장실' })).toBeVisible()
})

test('QR registration sends correct fields, retries with same key, restores token and cancels on server', async ({
  page,
}) => {
  const state = await mockApi(page)
  state.failRegisterOnce = true
  await page.goto('/w/live-code')
  await expect(page).toHaveURL(/waiting\/register\/7$/)
  await page.getByLabel('학번', { exact: true }).fill('202300012')
  await page.getByLabel('전화번호', { exact: true }).fill('01012341234')
  await page.getByRole('combobox', { name: '인원 수' }).selectOption('2')
  await page.getByLabel('동의합니다', { exact: true }).check()
  await page.getByRole('button', { name: '웨이팅 접수하기' }).click()
  await expect(page.getByRole('alert')).toContainText('서버에 연결하지 못했습니다')
  await page.getByRole('button', { name: '웨이팅 접수하기' }).click()
  await expect(page).toHaveURL(/\/waiting$/)
  await expect(page.getByText('37번', { exact: true })).toBeVisible()
  expect(state.keys[0]).toBe(state.keys[1])
  await page.reload()
  await expect(page.getByText('37번', { exact: true })).toBeVisible()
  expect(new Set(state.tokens).size).toBe(1)
  const stored = await page.evaluate(() => ({ ...localStorage }))
  expect(Object.keys(stored)).toEqual(['kufim.clientToken'])
  await page.getByRole('button', { name: '웨이팅 취소하기', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '취소하기', exact: true }).click()
  await expect(page.getByText('아직 신청한 웨이팅이 없어요.')).toBeVisible()
  expect(state.tickets).toHaveLength(0)
})

test('login protects admin route, errors stay visible, saves carry CSRF and persist after reload', async ({
  page,
}) => {
  const state = await mockApi(page)
  await page.goto('/admin/notices/new')
  await expect(page).toHaveURL(/admin\/login/)
  await page.getByLabel('아이디', { exact: true }).fill('admin')
  await page.getByLabel('비밀번호', { exact: true }).fill('wrong')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('로그인 정보를')
  await page.getByLabel('비밀번호', { exact: true }).fill('valid-password')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page
    .getByRole('navigation', { name: '주 메뉴' })
    .getByRole('link', { name: '전체 보기' })
    .click()
  await expect(page).toHaveURL('/admin')
  await page.getByRole('link', { name: '공지사항 등록', exact: true }).click()
  await page.getByRole('link', { name: '공지 등록하기', exact: true }).click()
  await expect(page).toHaveURL('/admin/notices/new')
  await page.getByRole('button', { name: '안내', exact: true }).click()
  await page.getByLabel('공지 제목', { exact: true }).fill('새 공지')
  await page.getByRole('textbox', { name: '공지 내용', exact: true }).fill('DB에 보낼 내용')
  state.failSave = true
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('저장 실패')
  await expect(page.getByLabel('공지 제목', { exact: true })).toHaveValue('새 공지')
  state.failSave = false
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await expect(page).toHaveURL(/admin\/notices$/)
  await page.reload()
  await page.getByRole('link', { name: /새 공지/ }).click()
  await expect(page.getByRole('textbox', { name: '공지 내용', exact: true })).toHaveValue(
    'DB에 보낼 내용',
  )
})

test('booth admin can operate assigned waiting, cannot open content management', async ({
  page,
}) => {
  await mockApi(page, { loggedIn: true, role: 'BOOTH_ADMIN' })
  await page.goto('/admin/notices')
  await expect(page).toHaveURL(/admin\/waiting$/)
  await expect(page.getByRole('link', { name: '테스트 부스', exact: true })).toBeVisible()
})

test('queue call, enter and settings use real contract', async ({ page }) => {
  const state = await mockApi(page, { loggedIn: true, active: true })
  await page.goto('/admin/waiting/7')
  await page.getByRole('button', { name: '호출하기' }).click()
  await expect(page.getByText(/호출완료 \/ 호출한지/)).toBeVisible()
  await page.getByRole('button', { name: '입장 완료', exact: true }).click()
  await expect(page.getByText('현재 대기 중인 팀이 없어요.')).toBeVisible()
  expect(state.tickets[0].status).toBe('ENTERED')
  await page.getByRole('link', { name: '부스 설정' }).click()
  await expect(page.getByLabel('호출 후 자동 취소 소요 시간 (분)')).toHaveAttribute('readonly', '')
  await page.getByRole('button', { name: '대기 마감' }).click()
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page.getByText('대기 마감', { exact: true })).toBeVisible()
  expect(state.status).toBe('PAUSED')
})

test('notifications persist read state', async ({ page }) => {
  const state = await mockApi(page)
  await page.goto('/notifications')
  await page.getByRole('button', { name: '전체 읽음' }).click()
  await expect(page.getByText('읽지 않은 알림 0개')).toHaveText('읽지 않은 알림 0개')
  await page.reload()
  await expect(page.getByText('읽지 않은 알림 0개')).toHaveText('읽지 않은 알림 0개')
  expect(state.notifications[0].readAt).not.toBeNull()
})

test('empty DB stays empty and API outage offers retry without fabricated data', async ({
  page,
}) => {
  await mockApi(page, { empty: true })
  await page.goto('/booths')
  await expect(page.getByText('해당하는 부스가 없어요.')).toBeVisible()
  await page.route('**/api/v1/booths', (route) => route.abort('failed'))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('서버에 연결하지 못했습니다')
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible()
})

test('session expiry returns to login and preserves visitor token', async ({ page }) => {
  const state = await mockApi(page, { loggedIn: true })
  await page.goto('/admin/notices/new')
  await page.getByLabel('공지 제목', { exact: true }).fill('만료 테스트')
  await page.getByRole('textbox', { name: '공지 내용', exact: true }).fill('내용')
  const token = await page.evaluate(() => localStorage.getItem('kufim.clientToken'))
  state.loggedIn = false
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page).toHaveURL(/admin\/login/)
  expect(await page.evaluate(() => localStorage.getItem('kufim.clientToken'))).toBe(token)
})
