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
  noFloorplan?: boolean
}
type Write = { method: string; path: string; body: Record<string, unknown> | null }
const urgentNotice = {
  noticeId: 5,
  title: '우천으로 야간 부스 조정',
  content: '현장 안내를 확인해주세요.',
  category: 'URGENT',
  publishedAt: '2026-09-30T12:30:00+09:00',
  unread: true,
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
    // Admin content writes, and the notice list they change.
    writes: [] as Write[],
    notices: [{ ...urgentNotice }] as (typeof urgentNotice)[],
    zones: [
      {
        zoneId: 1,
        stageId: 1,
        name: '스탠딩 A구역',
        displayOrder: 1,
        level: 'NORMAL',
        estimatedPeople: 300,
        updatedAt: '2026-09-30T12:57:00+09:00',
        active: true,
        recordedBy: '테스트 관리자',
      },
      {
        zoneId: 2,
        stageId: 1,
        name: '입장 대기열',
        displayOrder: 2,
        level: 'CROWDED',
        estimatedPeople: null,
        updatedAt: '2026-09-30T12:40:00+09:00',
        active: true,
        recordedBy: '테스트 관리자',
      },
    ] as Record<string, unknown>[],
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
  // No broker by default: the socket never completes CONNECT, so pages fall back to polling.
  // fakeStomp() registers later and takes precedence.
  await page.routeWebSocket('**/ws', () => {})
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

    const zoneWrite =
      /^(POST \/admin\/stages\/1\/zones|POST \/admin\/zones\/(\d+)\/congestion)$/.exec(key)
    if (zoneWrite) {
      const body = request.postDataJSON() as Record<string, unknown>
      state.writes.push({ method: 'POST', path, body })
      if (zoneWrite[2]) {
        const zone = state.zones.find((z) => String(z.zoneId) === zoneWrite[2])!
        Object.assign(zone, {
          level: body.level,
          estimatedPeople: body.estimatedPeople,
          updatedAt: now,
        })
        return ok(zone, 201)
      }
      const zone = {
        zoneId: 3,
        stageId: 1,
        name: body.name,
        displayOrder: body.displayOrder,
        level: null,
        estimatedPeople: null,
        updatedAt: null,
        active: true,
        recordedBy: null,
      }
      state.zones.push(zone)
      return ok(zone, 201)
    }
    const content =
      /^(POST|PATCH|DELETE) \/admin\/(notices|performances|booths|facilities)(?:\/(\d+))?$/.exec(
        key,
      )
    if (content) {
      const [, verb, kind, id] = content
      const body = request.postData() ? (request.postDataJSON() as Record<string, unknown>) : null
      state.writes.push({ method: verb, path: path, body })
      if (body?.pin && options.noFloorplan) return fail(404, 'M003', '등록된 도면이 없습니다.')
      if (kind === 'notices') {
        const notice = state.notices.find((n) => String(n.noticeId) === id)
        if (verb === 'POST')
          state.notices.unshift({
            ...urgentNotice,
            ...(body as object),
            noticeId: 100 + state.notices.length,
            unread: false,
          })
        if (verb === 'PATCH' && notice) Object.assign(notice, body)
        if (verb === 'DELETE') state.notices = state.notices.filter((n) => n !== notice)
      }
      return verb === 'DELETE'
        ? route.fulfill({ status: 204 })
        : ok({}, verb === 'POST' ? 201 : 200)
    }

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
      case 'GET /stages': {
        const zonesOf = (id: number) =>
          state.zones
            .filter((z) => z.stageId === id && z.active)
            .map(({ active: _active, recordedBy: _recordedBy, ...z }) => z)
        return ok([
          {
            stageId: 2,
            name: '서브무대',
            entryStatus: 'OPEN',
            displayOrder: 2,
            zones: zonesOf(2),
            serverTime: now,
          },
          {
            stageId: 1,
            name: '노천극장',
            entryStatus: 'RESTRICTED',
            displayOrder: 1,
            zones: zonesOf(1),
            serverTime: now,
          },
        ])
      }
      case 'GET /admin/stages/1/zones':
        return ok({ serverTime: now, zones: state.zones.filter((z) => z.stageId === 1) })
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
        return ok(state.notices)
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

// Skips the login form: the fake backend accepts the session and the XSRF cookie is set.
async function asSuperAdmin(page: Page, backend: { loggedIn: boolean }) {
  backend.loggedIn = true
  await page
    .context()
    .addCookies([{ name: 'XSRF-TOKEN', value: 'csrf-123', url: 'http://127.0.0.1:4174' }])
}

test('admin creates, edits and deletes a notice', async ({ page }) => {
  const backend = await fakeBackend(page)
  await asSuperAdmin(page, backend)
  await page.goto('/admin/notices/new')
  await page.getByRole('button', { name: '안전', exact: true }).click()
  await page.getByLabel('공지 제목').fill('분실물 센터 위치 안내')
  await page.getByLabel('공지 내용').fill('학생회관 1층에서 운영합니다.')
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page).toHaveURL(/\/admin\/notices$/)
  await expect(page.getByText('분실물 센터 위치 안내')).toBeVisible()
  expect(backend.writes.at(-1)).toEqual({
    method: 'POST',
    path: '/admin/notices',
    body: {
      title: '분실물 센터 위치 안내',
      content: '학생회관 1층에서 운영합니다.',
      category: 'SAFETY',
    },
  })
  const post = backend.requests.find(
    (r) => r.method() === 'POST' && r.url().endsWith('/admin/notices'),
  )!
  expect(post.headers()['x-xsrf-token']).toBe('csrf-123')

  await page.goto('/admin/notices/5/edit')
  await page.getByLabel('공지 제목').fill('우천 시 야간 부스 18시 종료')
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page.getByText('우천 시 야간 부스 18시 종료')).toBeVisible()
  expect(backend.writes.at(-1)?.method).toBe('PATCH')
  expect(backend.writes.at(-1)?.path).toBe('/admin/notices/5')

  await page.goto('/admin/notices/5/edit')
  await page.getByRole('button', { name: '공지 삭제하기' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '삭제하기' }).click()
  await expect(page).toHaveURL(/\/admin\/notices$/)
  await expect(page.getByText('우천 시 야간 부스 18시 종료')).toHaveCount(0)
  expect(backend.writes.at(-1)).toEqual({ method: 'DELETE', path: '/admin/notices/5', body: null })
})

test('admin performance form sends festival times and loads details for editing', async ({
  page,
}) => {
  const backend = await fakeBackend(page)
  await asSuperAdmin(page, backend)
  await page.goto('/admin/performances/new?day=2&stage=1')
  await page.getByRole('button', { name: '댄스', exact: true }).click()
  await page.getByLabel('무대 팀명').fill('DIUS')
  await page.getByLabel('공연 시작 시간').selectOption('18:00')
  await page.getByLabel('공연 종료 시간').selectOption('19:30')
  await page.getByLabel('공연 소개', { exact: true }).fill('댄스동아리 무대')
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page).toHaveURL(/\/admin\/performances\?day=2&stage=1$/)
  expect(backend.writes.at(-1)).toEqual({
    method: 'POST',
    path: '/admin/performances',
    body: {
      festivalId: 1,
      stageId: 1,
      title: 'DIUS',
      type: 'DANCE',
      description: '댄스동아리 무대',
      additionalDescription: '',
      castMembers: '',
      setlist: '',
      startAt: '2026-10-01T18:00:00+09:00',
      endAt: '2026-10-01T19:30:00+09:00',
    },
  })

  await page.goto('/admin/performances/10/edit')
  // A filled textarea inside its <label> adds its value to the accessible name.
  await expect(page.locator('textarea[name="description"]')).toHaveValue('정책동아리 옥슨의 무대')
  await expect(page.getByLabel('출연진')).toHaveValue('보컬 김건국')
  await expect(page.getByLabel('공연 시작 시간')).toHaveValue('12:00')
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page).toHaveURL(/\/admin\/performances\?day=1&stage=1$/)
  expect(backend.writes.at(-1)?.path).toBe('/admin/performances/10')
  expect(backend.writes.at(-1)?.body?.startAt).toBe('2026-09-30T12:00:00+09:00')
})

test('admin booth form sends the pin and waiting flag, and explains a missing floorplan', async ({
  page,
}) => {
  const backend = await fakeBackend(page, { noFloorplan: true })
  await asSuperAdmin(page, backend)
  await page.goto('/admin/booths/new?period=night')
  await page.getByRole('button', { name: '동아리', exact: true }).click()
  await page.getByLabel('부스 명').fill('밴드 주점')
  await page.getByLabel('운영 장소').fill('학생회관 앞')
  await page.getByLabel('QR 웨이팅 사용').uncheck()
  await page.getByRole('button', { name: '지도에서 위치 지정' }).click()
  await page.getByRole('button', { name: '지도에서 위치 선택' }).click()
  await page.getByRole('button', { name: '지정하기' }).click()
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page.getByRole('alert')).toContainText('지도 도면이 등록되지 않아')
  const body = backend.writes.at(-1)!.body!
  expect(body).toMatchObject({
    festivalId: 1,
    name: '밴드 주점',
    organizerType: 'CLUB',
    period: 'NIGHT',
    place: '학생회관 앞',
    operatingHours: '18:00~25:00',
    waitingEnabled: false,
  })
  expect(body.pin).toEqual({ xPercent: expect.any(Number), yPercent: expect.any(Number) })
})

test('a facility edit stays a facility and patches the facility resource', async ({ page }) => {
  const backend = await fakeBackend(page)
  await asSuperAdmin(page, backend)
  await page.goto('/admin/booths/facility-3/edit')
  await expect(page.getByRole('button', { name: '주간' })).toHaveCount(0)
  await expect(page.getByLabel('시설 명')).toHaveValue('공학관 화장실')
  await page.getByLabel('시설 소개').fill('공학관 1층 남녀 화장실')
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page).toHaveURL(/\/admin\/booths\?period=facility$/)
  expect(backend.writes.at(-1)).toMatchObject({
    method: 'PATCH',
    path: '/admin/facilities/3',
    body: { type: 'RESTROOM', description: '공학관 1층 남녀 화장실', operatingHours: '24시간' },
  })
  expect(backend.writes.at(-1)?.body?.pin).toBeUndefined()
})

test('booth admins do not see content management', async ({ page }) => {
  const backend = await fakeBackend(page, { role: 'BOOTH_ADMIN', managedBoothIds: [7] })
  await asSuperAdmin(page, backend)
  await page.goto('/admin')
  await expect(page.getByRole('link', { name: 'QR 웨이팅 관리' })).toBeVisible()
  await expect(page.getByRole('link', { name: '공지사항 등록' })).toHaveCount(0)
})

// A minimal STOMP 1.2 broker on /ws: answers CONNECT, records SUBSCRIBE, pushes MESSAGE.
async function fakeStomp(page: Page) {
  const frames: { command: string; headers: Record<string, string> }[] = []
  const subscriptions = new Map<string, string>()
  let socket: { send: (data: string) => void } | null = null
  await page.routeWebSocket('**/ws', (ws) => {
    socket = ws
    ws.onMessage((raw) => {
      for (const chunk of String(raw).split('\0')) {
        const text = chunk.replace(/^\n+/, '')
        if (!text) continue
        const [head] = text.split('\n\n')
        const [command, ...lines] = head.split('\n')
        const headers = Object.fromEntries(
          lines.map((line) => [
            line.slice(0, line.indexOf(':')),
            line.slice(line.indexOf(':') + 1),
          ]),
        )
        frames.push({ command, headers })
        if (command === 'CONNECT' || command === 'STOMP')
          ws.send('CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0')
        if (command === 'SUBSCRIBE') subscriptions.set(headers.destination, headers.id)
        if (command === 'UNSUBSCRIBE')
          for (const [destination, id] of subscriptions)
            if (id === headers.id) subscriptions.delete(destination)
      }
    })
  })
  return {
    frames,
    subscribed: (destination: string) => subscriptions.has(destination),
    push(destination: string, body: object) {
      const id = subscriptions.get(destination)
      if (!socket || !id) throw new Error(`not subscribed: ${destination}`)
      socket.send(
        `MESSAGE\ndestination:${destination}\nsubscription:${id}\nmessage-id:${Date.now()}\ncontent-type:application/json\n\n${JSON.stringify(body)}\0`,
      )
    },
  }
}

test('a call reaches the waiting page over STOMP without reloading', async ({ page }) => {
  const waiting = ticket()
  await fakeBackend(page, { tickets: [waiting] })
  const stomp = await fakeStomp(page)
  await page.goto('/waiting')
  await expect(page.getByText('1번째')).toBeVisible()
  const personal = `/topic/waiting/${waiting.waitingId}`
  await expect.poll(() => stomp.subscribed(personal)).toBe(true)
  expect(stomp.subscribed('/topic/booth/7/waiting')).toBe(true)
  expect(stomp.subscribed('/topic/notice')).toBe(true)
  const connect = stomp.frames.find((f) => f.command === 'CONNECT')!
  expect(connect.headers['X-Client-Token']).toMatch(uuidV4)

  // The admin calls on another device; only the STOMP message tells this page.
  Object.assign(waiting, {
    status: 'CALLED',
    calledAt: now,
    autoCancelAt: '2026-09-30T13:10:00+09:00',
  })
  stomp.push(personal, { type: 'WAITING_UPDATED', waitingId: waiting.waitingId, status: 'CALLED' })
  await expect(page.getByText('지금 입장해주세요!')).toBeVisible({ timeout: 3000 })
})

test('an urgent notice broadcast updates the home banner', async ({ page }) => {
  const backend = await fakeBackend(page)
  const stomp = await fakeStomp(page)
  await page.goto('/')
  await expect.poll(() => stomp.subscribed('/topic/notice')).toBe(true)
  backend.notices.unshift({
    ...backend.notices[0],
    noticeId: 6,
    title: '무대 앞 인파 과밀, 우회 바랍니다',
    publishedAt: now,
  })
  stomp.push('/topic/notice', { type: 'NOTICE_PUBLISHED', noticeId: 6 })
  await expect(page.getByText('무대 앞 인파 과밀, 우회 바랍니다')).toBeVisible({ timeout: 3000 })
})

test('the admin queue refreshes on its STOMP topic', async ({ page }) => {
  const backend = await fakeBackend(page, { tickets: [ticket()] })
  const stomp = await fakeStomp(page)
  backend.loggedIn = true
  await page.goto('/admin/waiting/7')
  await expect(page.getByText('1번', { exact: true })).toBeVisible()
  await expect.poll(() => stomp.subscribed('/topic/admin/booth/7/waiting')).toBe(true)
  await expect(page.getByText('실시간 연결됨')).toBeVisible()
  backend.tickets.push(
    ticket({
      waitingId: '33333333-3333-4333-8333-333333333333',
      waitingNumber: 2,
      registeredAt: now,
    }),
  )
  stomp.push('/topic/admin/booth/7/waiting', { type: 'WAITING_LIST_CHANGED', boothId: 7 })
  await expect(page.getByText('2번', { exact: true })).toBeVisible({ timeout: 3000 })
})

test('stage congestion shows color, label and gauge, and expires after 15 minutes', async ({
  page,
}) => {
  await fakeBackend(page)
  await page.goto('/')
  const stage = page.getByRole('region', { name: '노천극장 혼잡도' })
  await expect(stage.getByText('스탠딩 A구역')).toBeVisible()
  await expect(stage.getByRole('img', { name: '혼잡도 보통, 4단계 중 2단계' })).toBeVisible()
  await expect(stage.getByText('약 300명')).toBeVisible()
  await expect(stage.getByText('3분 전 갱신')).toBeVisible()
  // 12:40 is 20 minutes before the server time: shown as unknown, without the old level.
  await expect(stage.getByRole('img', { name: '혼잡도 정보 확인 중' })).toBeVisible()
  await expect(stage.getByText('혼잡', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: '서브무대 혼잡도' })).toHaveCount(0)
})

test('a congestion broadcast updates the zone without another request', async ({ page }) => {
  const backend = await fakeBackend(page)
  const stomp = await fakeStomp(page)
  await page.goto('/')
  await expect(page.getByRole('img', { name: '혼잡도 보통, 4단계 중 2단계' })).toBeVisible()
  await expect.poll(() => stomp.subscribed('/topic/congestion')).toBe(true)
  const before = backend.requests.length
  stomp.push('/topic/congestion', {
    type: 'CONGESTION_UPDATED',
    zoneId: 1,
    stageId: 1,
    name: '스탠딩 A구역',
    displayOrder: 1,
    level: 'VERY_CROWDED',
    estimatedPeople: 800,
    updatedAt: now,
  })
  await expect(page.getByRole('img', { name: '혼잡도 매우 혼잡, 4단계 중 4단계' })).toBeVisible({
    timeout: 3000,
  })
  await expect(page.getByText('약 800명')).toBeVisible()
  expect(backend.requests.slice(before).map((r) => r.url())).toEqual([])
})

test('the admin records congestion in one tap and adds zones', async ({ page }) => {
  const backend = await fakeBackend(page)
  await asSuperAdmin(page, backend)
  await page.goto('/admin')
  await page.getByRole('link', { name: '혼잡도 입력' }).click()
  await expect(page).toHaveURL(/\/admin\/congestion$/)
  const card = page.locator('.card').filter({ hasText: '스탠딩 A구역' })
  await card.getByRole('button', { name: '+50' }).click()
  await card.getByRole('button', { name: '+50' }).click()
  await card.getByRole('button', { name: '매우 혼잡' }).click()
  await expect
    .poll(() => backend.writes.at(-1)?.body)
    .toEqual({ level: 'VERY_CROWDED', estimatedPeople: 400 })
  expect(backend.writes.at(-1)?.path).toBe('/admin/zones/1/congestion')
  // 12:40 input is past the 5-minute recommendation.
  await expect(
    page
      .locator('.card')
      .filter({ hasText: '입장 대기열' })
      .getByText(/갱신 필요/),
  ).toBeVisible()

  await page.getByLabel('새 구역 이름').fill('VIP 구역')
  await page.getByRole('button', { name: '구역 추가' }).click()
  await expect(page.locator('.card').filter({ hasText: 'VIP 구역' })).toBeVisible()
  expect(backend.writes.at(-1)).toEqual({
    method: 'POST',
    path: '/admin/stages/1/zones',
    body: { name: 'VIP 구역', displayOrder: 3 },
  })
})
