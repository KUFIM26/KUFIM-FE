import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosAdapter, AxiosResponse } from 'axios'
import type { Account, WaitingConfig, WaitingStatus } from '../type'
import { createSeed, MOCK_SESSION_KEY, MOCK_STORAGE_KEY } from './seed'
import type { MockState, MockTicket } from './seed'

const active = (t: MockTicket) => t.status === 'WAITING' || t.status === 'CALLED'
const now = () => new Date().toISOString()
function load(): MockState {
  try {
    const saved = localStorage.getItem(MOCK_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    /* A cleared or invalid demo store starts with fresh sample content. */
  }
  return createSeed()
}

export const mockAdapter: AxiosAdapter = async (config) => {
  const state = load()
  const path = (config.url || '').split('?')[0]
  const method = (config.method || 'get').toUpperCase()
  const input = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {}
  const owner = String(config.headers.get('X-Client-Token') || '')
  const response = (data: unknown, status = 200): AxiosResponse => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state))
    return {
      config,
      status,
      statusText: String(status),
      headers: new AxiosHeaders(),
      data:
        status === 204 ? undefined : { success: true, data: structuredClone(data), error: null },
    }
  }
  const fail = (status: number, message: string): never => {
    throw new AxiosError(
      message,
      status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
      config,
      undefined,
      {
        config,
        status,
        statusText: String(status),
        headers: new AxiosHeaders(),
        data: { success: false, data: null, error: { code: 'MOCK_ERROR', message } },
      },
    )
  }
  const account: Account = {
    accountId: 1,
    name: '데모 관리자',
    role: 'SUPER_ADMIN',
    managedBoothIds: state.booths.map((b) => b.boothId),
  }
  if (path === '/admin/auth/login' && method === 'POST') {
    if (input.loginId !== 'admin' || input.password !== 'demo1234')
      return fail(401, '데모 계정은 admin / demo1234입니다.')
    sessionStorage.setItem(MOCK_SESSION_KEY, 'true')
    return response({ account, expiresIn: 86400 })
  }
  if (path.startsWith('/admin/') && sessionStorage.getItem(MOCK_SESSION_KEY) !== 'true')
    return fail(401, '관리자 로그인이 필요합니다.')
  if (path === '/admin/auth/me') return response(account)
  if (path === '/admin/auth/logout') {
    sessionStorage.removeItem(MOCK_SESSION_KEY)
    return response(null, 204)
  }
  const settings = (id: number): WaitingConfig =>
    state.configs[id] || {
      waitingEnabled: false,
      acceptingStatus: 'CLOSED',
      estimateMinutesPerTeam: 5,
      autoCancelMinutes: 10,
    }
  const queue = (id: number) => state.tickets.filter((t) => t.boothId === id && active(t))
  const view = (t: MockTicket) => {
    const ahead =
      t.status === 'WAITING'
        ? queue(t.boothId).filter((other) => other.waitingNumber < t.waitingNumber).length
        : 0
    const { owner: _owner, ...ticket } = t
    return {
      ...ticket,
      aheadTeamCount: ahead,
      position: t.status === 'WAITING' ? ahead + 1 : null,
      estimatedWaitMinutes: ahead * settings(t.boothId).estimateMinutesPerTeam,
      serverTime: now(),
    }
  }
  for (const t of state.tickets) {
    if (t.status === 'CALLED' && t.autoCancelAt && Date.parse(t.autoCancelAt) <= Date.now()) {
      t.status = 'AUTO_CANCELED'
      t.closedAt = now()
      t.closeReason = 'AUTO_CANCELED'
      state.notifications.unshift({
        notificationId: Date.now() + state.notifications.length,
        type: 'WAITING_AUTO_CANCELED',
        owner: t.owner,
        title: '웨이팅 자동 취소',
        body: `${t.boothName} 입장 시간이 지났습니다.`,
        createdAt: now(),
        readAt: null,
        waitingId: t.waitingId,
        noticeId: null,
      })
    }
  }
  if (path === '/festival')
    return response({
      festivalId: 1,
      name: '건국대학교 축제',
      location: '건국대학교 서울캠퍼스',
      startAt: state.startAt,
      endAt: state.endAt,
      serverTime: now(),
      summary: {
        operatingBoothCount: state.booths.length,
        todayPerformanceCount: state.performances.filter(
          (p) =>
            p.startAt.slice(0, 10) ===
            new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()),
        ).length,
        stageEntrySummary: [
          { stageId: 1, entryStatus: 'OPEN' },
          { stageId: 2, entryStatus: 'OPEN' },
        ],
      },
    })
  if (path === '/stages')
    return response([
      { stageId: 1, name: '대운동장 무대', entryStatus: 'OPEN', displayOrder: 0 },
      { stageId: 2, name: '일감호 무대', entryStatus: 'OPEN', displayOrder: 1 },
    ])
  if (path === '/map')
    return response({ floorplan: { imageUrl: '/assets/mock-map.svg', width: 800, height: 1000 } })
  if (path === '/map/pins')
    return response([
      ...state.booths.flatMap((b) =>
        b.pin
          ? [{ ...b.pin, pinId: b.boothId, targetId: b.boothId, targetType: 'BOOTH', name: b.name }]
          : [],
      ),
      ...state.facilities.flatMap((f) =>
        f.pin
          ? [
              {
                ...f.pin,
                pinId: f.facilityId + 1000,
                targetId: f.facilityId,
                targetType: 'FACILITY',
                name: f.name,
              },
            ]
          : [],
      ),
    ])
  const code = path.match(/^\/booths\/code\/mock-(\d+)$/)
  if (code)
    return response(
      state.booths.find((b) => b.boothId === Number(code[1])) ||
        fail(404, '부스를 찾을 수 없습니다.'),
    )
  const waitingRoute = path.match(
    /^\/(admin\/)?booths\/(\d+)\/(waiting-status|waitings|waiting-config)$/,
  )
  if (waitingRoute) {
    const id = Number(waitingRoute[2])
    const op = waitingRoute[3]
    const booth =
      state.booths.find((b) => b.boothId === id) || fail(404, '부스를 찾을 수 없습니다.')
    const cfg = settings(id)
    const list = queue(id)
    if (op === 'waiting-config' && waitingRoute[1]) {
      if (method === 'PATCH') {
        if (
          !['OPEN', 'PAUSED', 'CLOSED'].includes(input.acceptingStatus) ||
          !Number.isInteger(input.estimateMinutesPerTeam) ||
          input.estimateMinutesPerTeam < 1 ||
          input.estimateMinutesPerTeam > 360
        )
          return fail(400, '운영 설정을 확인해주세요.')
        Object.assign(cfg, {
          acceptingStatus: input.acceptingStatus,
          estimateMinutesPerTeam: input.estimateMinutesPerTeam,
        })
        booth.acceptingStatus = cfg.acceptingStatus
        booth.waitingStatus = booth.waitingEnabled ? cfg.acceptingStatus : 'DISABLED'
      }
      return response(cfg)
    }
    if (op === 'waiting-status')
      return response({
        boothId: id,
        waitingEnabled: booth.waitingEnabled,
        acceptingStatus: cfg.acceptingStatus,
        effectiveWaitingStatus: booth.waitingEnabled ? cfg.acceptingStatus : 'DISABLED',
        waitingTeamCount: list.length,
        estimatedWaitMinutes: list.length * cfg.estimateMinutesPerTeam,
        myActiveWaitingId: list.find((t) => t.owner === owner)?.waitingId || null,
      })
    if (op === 'waitings' && waitingRoute[1] && method === 'GET')
      return response({
        content: list.map((t) => ({
          ...view(t),
          studentNumberMasked: '2026*****',
          phoneNumberMasked: '010****0000',
          elapsedMinutes: Math.floor((Date.now() - Date.parse(t.registeredAt)) / 60000),
        })),
        waitingTeamCount: list.length,
        estimatedWaitMinutes: list.length * cfg.estimateMinutesPerTeam,
        acceptingStatus: cfg.acceptingStatus,
        serverTime: now(),
      })
    if (op === 'waitings' && !waitingRoute[1] && method === 'POST') {
      const key = `register:${owner}:${id}:${config.headers.get('Idempotency-Key')}`
      const existing = state.tickets.find((t) => t.waitingId === state.requests[key])
      if (existing) return response(view(existing))
      if (!booth.waitingEnabled || cfg.acceptingStatus !== 'OPEN')
        return fail(409, '현재 접수할 수 없는 부스입니다.')
      if (state.tickets.some((t) => t.owner === owner && active(t)))
        return fail(409, '이미 신청한 웨이팅이 있습니다.')
      if (
        !/^\d{9}$/.test(input.studentNumber) ||
        !/^010\d{8}$/.test(input.phoneNumber) ||
        !input.privacyConsent ||
        !Number.isInteger(input.partySize) ||
        input.partySize < 1 ||
        input.partySize > 6
      )
        return fail(400, '접수 정보를 확인해주세요.')
      // Never persist real student numbers or phone numbers in the demo store.
      const ticket: MockTicket = {
        owner,
        waitingId: crypto.randomUUID(),
        boothId: id,
        boothName: booth.name,
        waitingNumber:
          Math.max(
            0,
            ...state.tickets.filter((t) => t.boothId === id).map((t) => t.waitingNumber),
          ) + 1,
        partySize: input.partySize,
        status: 'WAITING',
        aheadTeamCount: list.length,
        position: list.length + 1,
        estimatedWaitMinutes: list.length * cfg.estimateMinutesPerTeam,
        registeredAt: now(),
        calledAt: null,
        lastRecalledAt: null,
        recallCount: 0,
        autoCancelAt: null,
        closedAt: null,
        closeReason: null,
        serverTime: now(),
      }
      state.tickets.push(ticket)
      state.requests[key] = ticket.waitingId
      return response(view(ticket), 201)
    }
  }
  if (path === '/waitings/me')
    return response(state.tickets.filter((t) => t.owner === owner && active(t)).map(view))
  const ticketRoute = path.match(
    /^\/(admin\/)?waitings\/([^/]+)(?:\/(call|cancel|enter|no-show|contact))?$/,
  )
  if (ticketRoute) {
    const t =
      state.tickets.find(
        (t) => t.waitingId === ticketRoute[2] && (ticketRoute[1] || t.owner === owner),
      ) || fail(404, '대기표를 찾을 수 없습니다.')
    const op = ticketRoute[3]
    if (ticketRoute[1] && op === 'contact') return response({ phoneNumber: '01000000000' })
    if (method === 'GET' && !op) return response(view(t))
    if (op === 'call' && method === 'POST') {
      const key = `call:${t.waitingId}:${config.headers.get('Idempotency-Key')}`
      if (state.requests[key]) return response({ ...view(t), smsStatus: 'NOT_CONFIGURED' })
      if (!active(t)) return fail(409, '종료된 웨이팅입니다.')
      if (t.status === 'CALLED') {
        t.recallCount++
        t.lastRecalledAt = now()
      } else {
        t.status = 'CALLED'
        t.calledAt = now()
        t.autoCancelAt = new Date(Date.now() + 600000).toISOString()
      }
      state.requests[key] = t.waitingId
      state.notifications.unshift({
        notificationId: Date.now(),
        type: 'WAITING_CALL',
        owner: t.owner,
        title: '입장할 차례예요!',
        body: `${t.boothName} ${t.waitingNumber}번 고객님, 부스로 와주세요.`,
        createdAt: now(),
        readAt: null,
        waitingId: t.waitingId,
        noticeId: null,
      })
      return response({ ...view(t), smsStatus: 'NOT_CONFIGURED' })
    }
    if (
      method === 'DELETE' ||
      (method === 'POST' && ['cancel', 'enter', 'no-show'].includes(op || ''))
    ) {
      if (!active(t) || ((op === 'enter' || op === 'no-show') && t.status !== 'CALLED'))
        return fail(409, '현재 상태에서는 처리할 수 없습니다.')
      t.status = ({ enter: 'ENTERED', 'no-show': 'NO_SHOW' }[op || ''] ||
        'CANCELED') as WaitingStatus
      t.closedAt = now()
      t.closeReason = t.status
      return response(method === 'DELETE' ? null : view(t), method === 'DELETE' ? 204 : 200)
    }
  }
  const notifications = state.notifications.filter((n) => !n.owner || n.owner === owner)
  if (path === '/notifications') {
    const page = Math.max(0, Number(config.params?.page) || 0)
    const size = Math.max(1, Number(config.params?.size) || 20)
    return response({
      content: notifications.slice(page * size, (page + 1) * size),
      page,
      totalPages: Math.ceil(notifications.length / size),
      totalElements: notifications.length,
      unreadCount: notifications.filter((n) => !n.readAt).length,
    })
  }
  if (path.startsWith('/notifications/') && method === 'PATCH') {
    const all = path.endsWith('/read-all')
    const id = Number(path.split('/')[2])
    const target = notifications.find((n) => n.notificationId === id)
    if (!all && !target) return fail(404, '알림을 찾을 수 없습니다.')
    let readCount = 0
    notifications.forEach((n) => {
      if ((all || n === target) && !n.readAt) {
        n.readAt = now()
        readCount++
      }
    })
    return response(
      all ? { readCount, unreadCount: 0 } : { notificationId: id, readAt: target!.readAt },
    )
  }
  const contentRoute = path.match(
    /^\/(admin\/)?(booths|facilities|performances|notices)(?:\/(\d+))?$/,
  )
  if (contentRoute) {
    const resource = contentRoute[2] as 'booths' | 'facilities' | 'performances' | 'notices'
    const idKey = {
      booths: 'boothId',
      facilities: 'facilityId',
      performances: 'performanceId',
      notices: 'noticeId',
    }[resource]
    // Each collection keeps its own DTO; dynamic routing shares only the CRUD mechanics.
    const rows = state[resource] as unknown as Record<string, unknown>[]
    const id = Number(contentRoute[3])
    const row = rows.find((r) => r[idKey] === id)
    if (method === 'GET') {
      if (id) return response(row || fail(404, '항목을 찾을 수 없습니다.'))
      let list = rows
      if (resource === 'booths' && config.params?.waitingOnly)
        list = list.filter((r) => r.waitingEnabled)
      if (resource === 'booths' && config.params?.sort === 'popular')
        list = [...list].sort(
          (a, b) => queue(Number(b.boothId)).length - queue(Number(a.boothId)).length,
        )
      if (config.params?.limit) list = list.slice(0, Number(config.params.limit))
      return response(list)
    }
    if (!contentRoute[1]) return fail(403, '관리자 요청이 필요합니다.')
    if (method === 'DELETE') {
      if (!row) return fail(404, '항목을 찾을 수 없습니다.')
      if (resource === 'booths' && queue(id).length)
        return fail(409, '대기 중인 팀이 있는 부스는 삭제할 수 없습니다.')
      rows.splice(rows.indexOf(row), 1)
      return response(null, 204)
    }
    if (method === 'POST' || method === 'PATCH') {
      if (method === 'PATCH' && !row) return fail(404, '항목을 찾을 수 없습니다.')
      const newId = row ? id : Math.max(0, ...rows.map((r) => Number(r[idKey]))) + 1
      const saved = { ...(row || {}), ...input, [idKey]: newId }
      if (resource === 'notices') saved.publishedAt ||= now()
      if (resource === 'booths') {
        state.configs[newId] = {
          ...settings(newId),
          waitingEnabled: !!saved.waitingEnabled,
          acceptingStatus: row ? settings(newId).acceptingStatus : 'OPEN',
        }
        saved.acceptingStatus = state.configs[newId].acceptingStatus
        saved.waitingStatus = saved.waitingEnabled ? saved.acceptingStatus : 'DISABLED'
      }
      if (row) Object.assign(row, saved)
      else rows.unshift(saved)
      if (resource === 'notices' && !row)
        state.notifications.unshift({
          notificationId: Date.now(),
          type: 'NOTICE',
          title: saved.title,
          body: saved.content,
          noticeId: newId,
          waitingId: null,
          createdAt: now(),
          readAt: null,
        })
      return response(saved, row ? 200 : 201)
    }
  }
  return fail(404, `지원하지 않는 목업 요청입니다: ${method} ${path}`)
}
