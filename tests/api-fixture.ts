import { expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'
import type {
  Account,
  BoothDto,
  FacilityDto,
  PerformanceDto,
  NoticeDto,
  WaitingTicket,
  AcceptingStatus,
  Notification,
} from '../src/apis/type'
export const booth: BoothDto = {
  boothId: 7,
  festivalId: 1,
  name: '테스트 부스',
  organizerType: 'STUDENT_COUNCIL',
  period: 'DAY',
  place: '청심대',
  operatingHours: '09:00~17:00',
  description: '서버 부스 소개',
  waitingEnabled: true,
  waitingStatus: 'OPEN',
  acceptingStatus: 'OPEN',
  pin: { xPercent: 40, yPercent: 50 },
}
export const facility: FacilityDto = {
  facilityId: 7,
  festivalId: 1,
  name: '공학관 화장실',
  type: 'RESTROOM',
  description: '시설 소개',
  place: '공학관',
  operatingHours: '24시간',
  pin: null,
}
export const performance: PerformanceDto = {
  performanceId: 9,
  festivalId: 1,
  stageId: 3,
  stageName: '호수 무대',
  title: '서버 밴드',
  type: 'BAND',
  startAt: '2026-10-09T14:00:00+09:00',
  endAt: '2026-10-09T15:00:00+09:00',
  status: 'NOW',
  description: '서버 공연 소개',
  castMembers: '출연진',
  setlist: '첫 곡',
}
export const notice: NoticeDto = {
  noticeId: 4,
  title: '서버 공지',
  content: '서버 공지 내용',
  category: 'INFO',
  publishedAt: '2026-10-09T09:00:00+09:00',
  unread: true,
}
export const ticket: WaitingTicket = {
  waitingId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  boothId: 7,
  boothName: booth.name,
  waitingNumber: 37,
  partySize: 2,
  status: 'WAITING',
  aheadTeamCount: 1,
  position: 2,
  estimatedWaitMinutes: 5,
  registeredAt: '2026-10-09T10:00:00+09:00',
  calledAt: null,
  lastRecalledAt: null,
  recallCount: 0,
  autoCancelAt: null,
  closedAt: null,
  closeReason: null,
  serverTime: '2026-10-09T10:05:00+09:00',
}
export const account: Account = {
  accountId: 1,
  name: '테스트 관리자',
  role: 'SUPER_ADMIN',
  managedBoothIds: [7],
}
export async function mockApi(
  page: Page,
  options: { loggedIn?: boolean; role?: Account['role']; active?: boolean; empty?: boolean } = {},
) {
  const state = {
    loggedIn: options.loggedIn || false,
    role: options.role || 'SUPER_ADMIN',
    tickets: options.active ? [{ ...ticket }] : ([] as WaitingTicket[]),
    notices: options.empty ? [] : [{ ...notice }],
    booths: options.empty ? [] : [{ ...booth }],
    facilities: options.empty ? [] : [{ ...facility }],
    performances: options.empty ? [] : [{ ...performance }],
    status: 'OPEN' as AcceptingStatus,
    minutes: 5,
    failSave: false,
    failDelete: false,
    deletions: [] as string[],
    qrIssued: true,
    qrIssues: 0,
    failRegisterOnce: false,
    keys: [] as string[],
    tokens: [] as string[],
    notifications: [
      {
        notificationId: 6,
        type: 'NOTICE',
        title: notice.title,
        body: notice.content,
        noticeId: 4,
        waitingId: null,
        createdAt: notice.publishedAt,
        readAt: null,
      },
    ] as Notification[],
  }
  await page
    .context()
    .addCookies([{ name: 'XSRF-TOKEN', value: 'test-csrf', url: 'http://127.0.0.1:4173' }])
  const ok = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, json: { success: true, data, error: null } })
  const fail = (route: Route, status: number, message: string, code = 'C001') =>
    route.fulfill({ status, json: { success: false, data: null, error: { code, message } } })
  await page.routeWebSocket('**/ws', () => {})
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()
    const headers = request.headers()
    expect(headers['x-client-token']).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    )
    expect(headers.authorization).toBeUndefined()
    state.tokens.push(headers['x-client-token'])
    if (path === '/admin/auth/login') {
      if (request.postDataJSON().password !== 'valid-password')
        return fail(route, 401, '로그인 정보를 확인해 주세요.', 'A001')
      state.loggedIn = true
      return ok(route, { account: { ...account, role: state.role }, expiresIn: 1800 })
    }
    if (path.startsWith('/admin/') && !state.loggedIn)
      return fail(route, 401, '관리자 세션이 필요합니다.', 'A004')
    if (path.startsWith('/admin/') && method !== 'GET')
      expect(headers['x-xsrf-token']).toBe('test-csrf')
    if (path === '/admin/auth/me') return ok(route, { ...account, role: state.role })
    if (path === '/admin/auth/logout') {
      state.loggedIn = false
      return route.fulfill({ status: 204 })
    }
    if (path === '/festival')
      return options.empty
        ? fail(route, 404, '축제를 찾을 수 없습니다.')
        : ok(route, {
            festivalId: 1,
            name: '서버 축제',
            location: '건국대학교',
            startAt: '2026-10-09T09:00:00+09:00',
            endAt: '2026-10-11T23:00:00+09:00',
            serverTime: '2026-10-09T14:30:00+09:00',
            summary: {
              operatingBoothCount: 1,
              todayPerformanceCount: 1,
              stageEntrySummary: [{ stageId: 3, entryStatus: 'OPEN' }],
            },
          })
    if (path === '/stages')
      return ok(
        route,
        options.empty
          ? []
          : [{ stageId: 3, name: '호수 무대', entryStatus: 'OPEN', displayOrder: 0 }],
      )
    if (path === '/map') return fail(route, 404, '등록된 도면이 없습니다.', 'M003')
    if (path === '/map/pins') return ok(route, [])
    if (path === '/booths' || (path === '/admin/booths' && method === 'GET'))
      return ok(route, state.booths)
    if (path === '/booths/7' || path === '/booths/code/live-code') return ok(route, state.booths[0])
    if (path.startsWith('/booths/code/'))
      return fail(route, 404, '유효하지 않은 QR 코드입니다.', 'B002')
    if (path === '/booths/7/waiting-status')
      return ok(route, {
        boothId: 7,
        waitingEnabled: true,
        acceptingStatus: state.status,
        effectiveWaitingStatus: state.status,
        waitingTeamCount: state.tickets.length,
        estimatedWaitMinutes: state.tickets.length * 5,
        myActiveWaitingId: state.tickets[0]?.waitingId || null,
      })
    if (path === '/facilities' || (path === '/admin/facilities' && method === 'GET'))
      return ok(route, state.facilities)
    if (path === '/facilities/7') return ok(route, state.facilities[0])
    if (path === '/performances' || (path === '/admin/performances' && method === 'GET'))
      return ok(route, state.performances)
    if (path === '/performances/9') return ok(route, state.performances[0])
    if (path === '/notices') return ok(route, state.notices)
    if (method === 'DELETE' && (path === '/admin/notices/4' || path === '/admin/performances/9')) {
      state.deletions.push(path)
      if (state.failDelete) return fail(route, 409, '삭제 실패 테스트')
      if (path === '/admin/notices/4') state.notices = []
      else state.performances = []
      return route.fulfill({ status: 204 })
    }
    if (
      (path === '/admin/notices' && method === 'POST') ||
      (path.startsWith('/admin/notices/') && method === 'PATCH')
    ) {
      if (state.failSave) return fail(route, 400, '저장 실패 테스트')
      const input = request.postDataJSON()
      const row = {
        ...notice,
        ...input,
        noticeId: method === 'POST' ? 5 : Number(path.split('/').pop()),
      }
      state.notices = [row, ...state.notices.filter((n) => n.noticeId !== row.noticeId)]
      return ok(route, row, method === 'POST' ? 201 : 200)
    }
    if (path === '/admin/booths/7' && method === 'PATCH') {
      Object.assign(state.booths[0], request.postDataJSON())
      return ok(route, state.booths[0])
    }
    if (path === '/admin/facilities/7' && method === 'PATCH') {
      Object.assign(state.facilities[0], request.postDataJSON())
      return ok(route, state.facilities[0])
    }
    if (path === '/admin/performances/9' && method === 'PATCH') {
      Object.assign(state.performances[0], request.postDataJSON())
      return ok(route, state.performances[0])
    }
    if (path === '/waitings/me')
      return ok(
        route,
        state.tickets.filter((t) => t.status === 'WAITING' || t.status === 'CALLED'),
      )
    if (path === '/booths/7/waitings' && method === 'POST') {
      state.keys.push(headers['idempotency-key'])
      if (state.failRegisterOnce) {
        state.failRegisterOnce = false
        return route.abort('failed')
      }
      expect(request.postDataJSON()).toEqual({
        studentNumber: '202300012',
        phoneNumber: '01012341234',
        partySize: 2,
        privacyConsent: true,
      })
      state.tickets = [{ ...ticket }]
      return ok(route, ticket, 201)
    }
    if (path === `/waitings/${ticket.waitingId}` && method === 'DELETE') {
      state.tickets = []
      return route.fulfill({ status: 204 })
    }
    if (path === '/admin/booths/7/waitings')
      return ok(route, {
        content: state.tickets.map((t) => ({
          ...t,
          studentNumberMasked: '2023*****',
          phoneNumberMasked: '010****1234',
          elapsedMinutes: 5,
        })),
        waitingTeamCount: state.tickets.filter((t) => t.status === 'WAITING').length,
        estimatedWaitMinutes: 5,
        acceptingStatus: state.status,
        serverTime: ticket.serverTime,
      })
    if (path === '/admin/booths/7/waiting-config') {
      if (method === 'PATCH') {
        const input = request.postDataJSON()
        expect(input).not.toHaveProperty('autoCancelMinutes')
        state.status = input.acceptingStatus
        state.minutes = input.estimateMinutesPerTeam
      }
      return ok(route, {
        waitingEnabled: true,
        acceptingStatus: state.status,
        estimateMinutesPerTeam: state.minutes,
        autoCancelMinutes: 10,
      })
    }
    if (path === '/admin/booths/7/qr') {
      if (method === 'POST') {
        state.qrIssued = true
        state.qrIssues++
        return ok(route, { boothId: 7, boothCode: 'live-code', url: '/w/live-code' })
      }
      if (!state.qrIssued) return fail(route, 404, '발급된 QR 코드가 없습니다.', 'B002')
      return route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1sAAAAASUVORK5CYII=',
          'base64',
        ),
      })
    }
    if (path.startsWith(`/admin/waitings/${ticket.waitingId}/`)) {
      const op = path.split('/').pop()
      if (op === 'contact') return ok(route, { phoneNumber: '01012341234' })
      if (op === 'call') {
        state.tickets[0].status = 'CALLED'
        state.tickets[0].calledAt = ticket.serverTime
        expect(headers['idempotency-key']).toBeTruthy()
      } else
        state.tickets[0].status =
          op === 'enter' ? 'ENTERED' : op === 'no-show' ? 'NO_SHOW' : 'CANCELED'
      return ok(route, { ...state.tickets[0], smsStatus: 'NOT_CONFIGURED' })
    }
    if (path === '/notifications')
      return ok(route, {
        content: state.notifications,
        page: 0,
        totalPages: 1,
        totalElements: state.notifications.length,
        unreadCount: state.notifications.filter((n) => !n.readAt).length,
      })
    if (path.startsWith('/notifications/') && method === 'PATCH') {
      state.notifications.forEach((n) => {
        if (path.endsWith('/read-all') || n.notificationId === Number(path.split('/')[2]))
          n.readAt = ticket.serverTime
      })
      return ok(route, { readCount: 1, unreadCount: 0 })
    }
    throw new Error(`Unhandled API request: ${method} ${path}`)
  })
  return state
}
