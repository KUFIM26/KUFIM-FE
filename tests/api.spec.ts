import { expect, test } from '@playwright/test'
import type { Page, Request } from '@playwright/test'

// A small in-browser stand-in for KUFIM-BE. Shapes follow the backend controllers.
type Ticket = {
  waitingId: string
  boothId: number
  boothName: string
  waitingNumber: number
  partySize: number
  status: string
  registeredAt: string
  calledAt: string | null
  autoCancelAt: string | null
  recallCount: number
}
type Options = {
  tickets?: Ticket[]
  duplicateOnRegister?: boolean
  failCatalogOnce?: boolean
  role?: 'SUPER_ADMIN' | 'BOOTH_ADMIN'
  managedBoothIds?: number[]
}
const now = '2026-09-30T13:00:00+09:00'
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const booth = {
  boothId: 7,
  name: '컴공 주점',
  organizerType: 'COLLEGE',
  period: 'DAY',
  place: '공학관 앞',
  operatingHours: '10:00~17:00',
  waitingEnabled: true,
  waitingStatus: 'OPEN',
  pin: null,
}
const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  waitingId: '11111111-1111-4111-8111-111111111111',
  boothId: 7,
  boothName: booth.name,
  waitingNumber: 1,
  partySize: 2,
  status: 'WAITING',
  registeredAt: '2026-09-30T12:40:00+09:00',
  calledAt: null,
  autoCancelAt: null,
  recallCount: 0,
  ...overrides,
})

async function fakeBackend(page: Page, options: Options = {}) {
  const state = {
    tickets: [...(options.tickets ?? [])],
    loggedIn: false,
    catalogFailures: options.failCatalogOnce ? 1 : 0,
    requests: [] as Request[],
  }
  const active = () => state.tickets.filter((t) => t.status === 'WAITING' || t.status === 'CALLED')
  const view = (t: Ticket) => {
    const ahead = active().filter(
      (o) => o.status === 'WAITING' && o.registeredAt < t.registeredAt,
    ).length
    return {
      ...t,
      aheadTeamCount: t.status === 'WAITING' ? ahead : 0,
      position: t.status === 'WAITING' ? ahead + 1 : null,
      estimatedWaitMinutes: ahead * 5,
      lastRecalledAt: null,
      closedAt: null,
      closeReason: null,
      serverTime: now,
    }
  }
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    state.requests.push(request)
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()
    const ok = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data, error: null }),
      })
    const fail = (status: number, code: string, message: string) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, error: { code, message } }),
      })
    const key = `${method} ${path}`

    if (path.startsWith('/admin') && !path.startsWith('/admin/auth/login') && !state.loggedIn)
      return fail(401, 'A004', '관리자 세션이 필요합니다.')
    if (path.startsWith('/admin') && method !== 'GET' && !path.startsWith('/admin/auth/login'))
      if (request.headers()['x-xsrf-token'] !== 'csrf-123')
        return fail(403, 'A003', '접근 권한이 없습니다.')

    switch (key) {
      case 'GET /festival':
        return ok({
          festivalId: 1,
          name: '2026 테스트 대동제',
          location: '건국대학교 서울캠퍼스',
          startAt: '2026-09-30T09:00:00+09:00',
          endAt: '2026-10-01T23:00:00+09:00',
          status: 'ONGOING',
          serverTime: now,
          summary: {
            operatingBoothCount: 12,
            todayPerformanceCount: 3,
            stageEntrySummary: [{ stageId: 1, entryStatus: 'RESTRICTED' }],
          },
        })
      case 'GET /booths':
        if (state.catalogFailures > 0) {
          state.catalogFailures--
          return fail(500, 'C999', '일시적인 오류입니다.')
        }
        return ok([booth])
      case 'GET /booths/7':
        return ok({ ...booth, description: '컴퓨터공학부가 운영하는 주점입니다.' })
      case 'GET /booths/code/abc123':
        return ok({ ...booth, myActiveWaitingId: active()[0]?.waitingId ?? null })
      case 'GET /booths/7/waiting-status':
        return ok({
          boothId: 7,
          waitingEnabled: true,
          acceptingStatus: 'OPEN',
          effectiveWaitingStatus: 'OPEN',
          waitingTeamCount: active().filter((t) => t.status === 'WAITING').length,
          estimatedWaitMinutes: 0,
          estimationAvailable: true,
          myActiveWaitingId: active()[0]?.waitingId ?? null,
          serverTime: now,
        })
      case 'POST /booths/7/waitings': {
        if (options.duplicateOnRegister || active().length)
          return fail(409, 'W001', '이미 활성 대기표가 있습니다.')
        const created = ticket({
          waitingId: '22222222-2222-4222-8222-222222222222',
          partySize: request.postDataJSON().partySize,
          registeredAt: now,
        })
        state.tickets.push(created)
        return ok(view(created), 201)
      }
      case 'GET /waitings/me':
        return ok(active().map(view))
      case 'GET /facilities':
        return ok([
          {
            facilityId: 3,
            type: 'RESTROOM',
            name: '공학관 화장실',
            description: '공학관 1층',
            place: '공학관',
            operatingHours: '24시간',
            pin: null,
          },
        ])
      case 'GET /stages':
        return ok([
          { stageId: 2, name: '서브무대', entryStatus: 'OPEN', displayOrder: 2 },
          { stageId: 1, name: '노천극장', entryStatus: 'RESTRICTED', displayOrder: 1 },
        ])
      case 'GET /performances':
        return ok([
          {
            performanceId: 10,
            title: 'OXEN',
            type: 'BAND',
            stageId: 1,
            stageName: '노천극장',
            place: '노천극장',
            startAt: '2026-09-30T12:00:00+09:00',
            endAt: '2026-09-30T14:00:00+09:00',
            status: 'NOW',
          },
          {
            performanceId: 11,
            title: 'DIUS',
            type: 'DANCE',
            stageId: 1,
            stageName: '노천극장',
            place: '노천극장',
            startAt: '2026-10-01T18:00:00+09:00',
            endAt: '2026-10-01T19:00:00+09:00',
            status: 'NEXT',
          },
        ])
      case 'GET /performances/10':
        return ok({
          performanceId: 10,
          title: 'OXEN',
          type: 'BAND',
          stageId: 1,
          stageName: '노천극장',
          place: '노천극장',
          startAt: '2026-09-30T12:00:00+09:00',
          endAt: '2026-09-30T14:00:00+09:00',
          status: 'NOW',
          description: '정책동아리 옥슨의 무대',
          additionalDescription: null,
          castMembers: '보컬 김건국',
          setlist: '첫 곡\n두 번째 곡',
        })
      case 'GET /notices':
        return ok([
          {
            noticeId: 5,
            title: '우천으로 야간 부스 조정',
            content: '현장 안내를 확인해주세요.',
            category: 'URGENT',
            publishedAt: '2026-09-30T12:30:00+09:00',
            unread: true,
          },
        ])
      case 'GET /notifications':
        return ok({
          content: [
            {
              notificationId: 1,
              type: 'WAITING_CALL',
              title: '부스 입장 호출',
              body: '컴공 주점에서 입장할 차례입니다.',
              createdAt: now,
              readAt: null,
              noticeId: null,
              waitingId: 'x',
            },
          ],
          page: 0,
          size: 50,
          totalElements: 1,
          totalPages: 1,
          unreadCount: 1,
        })
      case 'POST /admin/auth/login':
        state.loggedIn = true
        // KUFIM-BE sets XSRF-TOKEN on login; the fake sets it on the page origin instead.
        await page
          .context()
          .addCookies([
            { name: 'XSRF-TOKEN', value: 'csrf-123', url: new URL(request.url()).origin },
          ])
        return ok({ account: account(options), expiresIn: 1800 })
      case 'GET /admin/auth/me':
        return ok(account(options))
      case 'GET /admin/booths/7/waitings':
        return ok({
          summary: {
            waiting: 1,
            called: 0,
            enteredToday: 0,
            autoCanceledToday: 0,
            canceledToday: 0,
          },
          waitingTeamCount: active().filter((t) => t.status === 'WAITING').length,
          estimatedWaitMinutes: 5,
          acceptingStatus: 'OPEN',
          content: state.tickets.map((t) => ({
            ...view(t),
            studentNumberMasked: '2023****2',
            phoneNumberMasked: '010-****-1234',
            elapsedMinutes: 20,
          })),
          serverTime: now,
        })
    }
    const action = /^POST \/admin\/waitings\/([^/]+)\/(call|enter|cancel)$/.exec(key)
    const cancel = /^DELETE \/waitings\/([^/]+)$/.exec(key)
    const target = state.tickets.find((t) => t.waitingId === (action?.[1] ?? cancel?.[1]))
    if (cancel && target) {
      target.status = 'CANCELED'
      return route.fulfill({ status: 204 })
    }
    if (action && target) {
      if (action[2] === 'call')
        Object.assign(target, {
          status: 'CALLED',
          calledAt: now,
          autoCancelAt: '2026-09-30T13:10:00+09:00',
        })
      else target.status = action[2] === 'enter' ? 'ENTERED' : 'CANCELED'
      return ok(view(target))
    }
    return fail(404, 'RESOURCE_NOT_FOUND', `fake backend: ${key}`)
  })
  return state
}
const account = (options: Options) => ({
  accountId: 1,
  name: '테스트 관리자',
  role: options.role ?? 'SUPER_ADMIN',
  managedBoothIds: options.managedBoothIds ?? [],
})

test('catalog pages render backend data', async ({ page }) => {
  const backend = await fakeBackend(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '2026 테스트 대동제' })).toBeVisible()
  await expect(page.getByText('12개')).toBeVisible()
  await expect(page.getByText('제한', { exact: true })).toBeVisible()
  await expect(page.getByText('우천으로 야간 부스 조정')).toBeVisible()
  await page.getByRole('link', { name: /OXEN/ }).first().click()
  await expect(page.getByText('보컬 김건국')).toBeVisible()
  await expect(page.getByText('노천극장 12:00~14:00')).toBeVisible()

  await page.goto('/performances')
  await expect(page.getByRole('button', { name: /DAY 1\s*9월 30일 \(수\)/ })).toBeVisible()
  await expect(page.getByRole('button', { name: '노천극장', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: /DAY 2/ }).click()
  await expect(page.getByText('DIUS')).toBeVisible()

  await page.goto('/booths?period=facility')
  await expect(page.getByText('공학관 화장실')).toBeVisible()
  // Public pages must not probe the admin session (it shows up as 401 noise for every visitor).
  expect(backend.requests.filter((r) => r.url().includes('/api/v1/admin/'))).toEqual([])
})

test('catalog failure offers a retry', async ({ page }) => {
  await fakeBackend(page, { failCatalogOnce: true })
  await page.goto('/')
  await expect(page.getByRole('alert')).toHaveText('일시적인 오류입니다.')
  await page.getByRole('button', { name: '다시 시도' }).click()
  await expect(page.getByRole('heading', { name: '2026 테스트 대동제' })).toBeVisible()
})

test('QR entry registers a waiting tied to the browser token', async ({ page }) => {
  const backend = await fakeBackend(page)
  await page.goto('/w/abc123')
  await expect(page).toHaveURL(/\/waiting\/register\/7$/)
  await expect(page.getByText('컴퓨터공학부가 운영하는 주점입니다.')).toBeVisible()
  await page.getByLabel('학번', { exact: true }).fill('202300012')
  await page.getByLabel('전화번호', { exact: true }).fill('01012341234')
  await page.getByRole('combobox', { name: '인원 수' }).selectOption('3')
  await page.getByLabel('동의합니다', { exact: true }).check()
  await page.getByRole('button', { name: '웨이팅 접수하기' }).click()
  await expect(page).toHaveURL(/\/waiting$/)
  await expect(page.getByText('웨이팅 번호 1번')).toBeVisible()

  const post = backend.requests.find((r) => r.method() === 'POST' && r.url().endsWith('/waitings'))!
  const token = post.headers()['x-client-token']
  expect(token).toMatch(uuidV4)
  expect(post.headers()['idempotency-key']).toMatch(uuidV4)
  expect(post.postDataJSON()).toEqual({
    studentNumber: '202300012',
    phoneNumber: '01012341234',
    partySize: 3,
    privacyConsent: true,
  })

  // The ticket is restored from the server with the same token after a reload.
  await page.reload()
  await expect(page.getByText('웨이팅 번호 1번')).toBeVisible()
  const restored = backend.requests.filter((r) => r.url().endsWith('/waitings/me')).at(-1)!
  expect(restored.headers()['x-client-token']).toBe(token)

  // Scanning again with an active ticket goes straight to it.
  await page.goto('/w/abc123')
  await expect(page).toHaveURL(/\/waiting$/)

  await page.getByRole('button', { name: '웨이팅 취소하기', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '취소하기', exact: true }).click()
  await expect(page.getByText('아직 신청한 웨이팅이 없어요.')).toBeVisible()
})

test('a duplicate registration points to the existing ticket', async ({ page }) => {
  await fakeBackend(page, { duplicateOnRegister: true })
  await page.goto('/waiting/register/7')
  await page.getByLabel('학번', { exact: true }).fill('202300012')
  await page.getByLabel('전화번호', { exact: true }).fill('01012341234')
  await page.getByRole('combobox', { name: '인원 수' }).selectOption('2')
  await page.getByLabel('동의합니다', { exact: true }).check()
  await page.getByRole('button', { name: '웨이팅 접수하기' }).click()
  await expect(page.getByText('이미 대기 중인 부스가 있어요.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: '내 대기표 보기' })).toBeVisible()
})

test('a called ticket shows the entry deadline', async ({ page }) => {
  await fakeBackend(page, {
    tickets: [
      ticket({
        status: 'CALLED',
        calledAt: now,
        autoCancelAt: '2026-09-30T13:10:00+09:00',
      }),
    ],
  })
  await page.goto('/waiting')
  await expect(page.getByText('지금 입장해주세요!')).toBeVisible()
  await expect(page.getByText('13:10')).toBeVisible()
  await page.goto('/notifications')
  await expect(page.getByText('컴공 주점에서 입장할 차례입니다.')).toBeVisible()
})

test('admin login, call and entry use the session and XSRF header', async ({ page }) => {
  const backend = await fakeBackend(page, { tickets: [ticket()] })
  await page.goto('/admin/waiting/7')
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fwaiting%2F7$/)
  await page.getByPlaceholder('관리자 아이디').fill('admin')
  await page.getByPlaceholder('비밀번호').fill('secret')
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/admin\/waiting\/7$/)
  await expect(page.getByText('2023****2')).toBeVisible()

  await page.getByRole('button', { name: '호출하기' }).click()
  await expect(page.getByText(/13:00 호출완료/)).toBeVisible()
  const call = backend.requests.find((r) => r.url().endsWith('/call'))!
  expect(call.headers()['x-xsrf-token']).toBe('csrf-123')
  expect(call.headers()['idempotency-key']).toMatch(uuidV4)
  expect(call.headers()['x-client-token']).toBeUndefined()

  await page.getByRole('button', { name: '입장 완료' }).click()
  await expect(page.getByText('현재 대기 중인 팀이 없어요.')).toBeVisible()
})

test('a booth admin only sees assigned booths', async ({ page }) => {
  const backend = await fakeBackend(page, { role: 'BOOTH_ADMIN', managedBoothIds: [] })
  backend.loggedIn = true
  await page.goto('/admin/waiting')
  await expect(page.getByText('웨이팅을 운영하는 담당 부스가 없어요.')).toBeVisible()
  await page.goto('/admin/waiting/7')
  await expect(page.getByText('담당 부스가 아니라서 운영할 수 없어요.')).toBeVisible()
})
