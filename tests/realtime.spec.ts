import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mockApi, ticket } from './api-fixture'

// Real STOMP frames over a browser-intercepted WebSocket.
async function broker(page: Page) {
  const subscriptions = new Map<string, string>()
  const connections: Record<string, string>[] = []
  let socket: { send: (data: string) => void; close: () => void } | undefined
  await page.routeWebSocket('**/ws', (ws) => {
    socket = ws
    subscriptions.clear()
    ws.onMessage((raw) => {
      for (const chunk of String(raw).split('\0')) {
        const [head] = chunk.replace(/^\n+/, '').split('\n\n')
        const [command, ...lines] = head.split('\n')
        const headers = Object.fromEntries(
          lines.map((line) => {
            const colon = line.indexOf(':')
            return [line.slice(0, colon), line.slice(colon + 1)]
          }),
        )
        if (command === 'CONNECT' || command === 'STOMP') {
          connections.push(headers)
          ws.send('CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0')
        }
        if (command === 'SUBSCRIBE') subscriptions.set(headers.destination, headers.id)
        if (command === 'UNSUBSCRIBE') {
          for (const [destination, id] of subscriptions) {
            if (id === headers.id) subscriptions.delete(destination)
          }
        }
      }
    })
  })
  return {
    connections,
    subscribed: (topic: string) => subscriptions.has(topic),
    disconnect: () => {
      subscriptions.clear()
      socket?.close()
    },
    push(topic: string) {
      const id = subscriptions.get(topic)
      if (!id || !socket) throw new Error(`Missing subscription: ${topic}`)
      socket.send(
        `MESSAGE\ndestination:${topic}\nsubscription:${id}\nmessage-id:${Date.now()}\ncontent-type:application/json\n\n{}\0`,
      )
    },
  }
}

test('public routes skip session lookup, admin entry restores the session', async ({ page }) => {
  await mockApi(page, { loggedIn: true })
  const lookups: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('/admin/auth/me')) lookups.push(request.url())
  })
  await page.goto('/booths')
  await expect(page.getByRole('heading', { name: '테스트 부스' })).toBeVisible()
  expect(lookups).toHaveLength(0)
  await page.goto('/admin')
  await expect(page.getByRole('link', { name: 'QR 웨이팅 관리' })).toBeVisible()
  expect(lookups).toHaveLength(1)
})

for (const code of ['A005', 'A003']) {
  test(`${code} differentiates lost CSRF from denied permission`, async ({ page }) => {
    await mockApi(page, { loggedIn: true })
    await page.route('**/api/v1/admin/notices', (route) =>
      route.fulfill({
        status: 403,
        json: {
          success: false,
          data: null,
          error: { code, message: '검증 오류' },
        },
      }),
    )
    await page.goto('/admin/notices/new')
    const token = await page.evaluate(() => localStorage.getItem('kufim.clientToken'))
    await page.getByLabel('공지 제목', { exact: true }).fill('보안 확인')
    await page.getByRole('textbox', { name: '공지 내용', exact: true }).fill('내용')
    await page.getByRole('button', { name: '저장하기', exact: true }).click()
    if (code === 'A005') await expect(page).toHaveURL(/admin\/login\?next=/)
    else {
      await expect(page.getByRole('alert')).toHaveText('검증 오류')
      await expect(page).toHaveURL(/admin\/notices\/new$/)
    }
    expect(await page.evaluate(() => localStorage.getItem('kufim.clientToken'))).toBe(token)
  })
}

for (const role of ['SUPER_ADMIN', 'BOOTH_ADMIN'] as const) {
  test(`missing QR can only be issued by ${role === 'SUPER_ADMIN' ? 'super admin' : 'request to super admin'}`, async ({
    page,
  }) => {
    const state = await mockApi(page, { loggedIn: true, role })
    state.qrIssued = false
    await page.goto('/admin/waiting/7/settings')
    await expect(page.getByText('아직 발급된 QR 코드가 없습니다.')).toBeVisible()
    const issue = page.getByRole('button', { name: 'QR 코드 발급하기', exact: true })
    if (role === 'SUPER_ADMIN') {
      await issue.click()
      await expect(page.getByAltText('테스트 부스 웨이팅 접수 QR 코드')).toBeVisible()
      await expect(issue).toHaveCount(0)
      expect(state.qrIssues).toBe(1)
    } else {
      await expect(issue).toHaveCount(0)
      await expect(page.getByText('총괄 관리자에게 QR 발급을 요청해주세요.')).toBeVisible()
      expect(state.qrIssues).toBe(0)
    }
  })
}

test('STOMP updates a ticket immediately and shares a single connection', async ({ page }) => {
  const state = await mockApi(page, { active: true })
  const stomp = await broker(page)
  await page.goto('/waiting')
  const topic = `/topic/waiting/${ticket.waitingId}`
  await expect.poll(() => stomp.subscribed(topic)).toBe(true)
  await expect(page.getByText('2번째', { exact: true })).toBeVisible()
  expect(stomp.subscribed('/topic/booth/7/waiting')).toBe(true)
  expect(stomp.connections).toHaveLength(1)
  expect(stomp.connections[0]['X-Client-Token']).toBe(
    await page.evaluate(() => localStorage.getItem('kufim.clientToken')),
  )
  Object.assign(state.tickets[0], { status: 'CALLED', autoCancelAt: ticket.serverTime })
  stomp.push(topic)
  await expect(page.getByRole('heading', { name: '호출됨', exact: true })).toBeVisible({
    timeout: 3000,
  })
})

test('STOMP refreshes only notices and booth waiting summaries', async ({ page }) => {
  const state = await mockApi(page)
  Object.assign(state.booths[0], { waitingTeamCount: 3, estimatedWaitMinutes: 15 })
  const stomp = await broker(page)
  await page.goto('/booths')
  await expect(page.getByText('3팀', { exact: true })).toBeVisible()
  await expect(page.getByText('15분', { exact: true })).toBeVisible()
  await expect.poll(() => stomp.subscribed('/topic/booth/7/waiting')).toBe(true)
  Object.assign(state.booths[0], { waitingTeamCount: 4, estimatedWaitMinutes: 20 })
  stomp.push('/topic/booth/7/waiting')
  await expect(page.getByText('4팀', { exact: true })).toBeVisible({ timeout: 3000 })
  await page.goto('/notices')
  await expect(page.getByText('서버 공지', { exact: true })).toBeVisible()
  await expect.poll(() => stomp.subscribed('/topic/notice')).toBe(true)
  const requests: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/api/v1/')) requests.push(new URL(r.url()).pathname)
  })
  state.notices[0].title = '방금 변경된 공지'
  stomp.push('/topic/notice')
  await expect(page.getByText('방금 변경된 공지', { exact: true })).toBeVisible({ timeout: 3000 })
  expect(requests).toEqual(['/api/v1/notices'])
})

test('admin queue falls back to polling after the socket disconnects', async ({ page }) => {
  const state = await mockApi(page, { loggedIn: true, active: true })
  const stomp = await broker(page)
  await page.goto('/admin/waiting/7')
  await expect(page.getByText('실시간 연결됨', { exact: true })).toBeVisible()
  Object.assign(state.tickets[0], { status: 'CALLED' })
  stomp.push('/topic/admin/booth/7/waiting')
  await expect(page.getByRole('button', { name: '재호출', exact: true })).toBeVisible({
    timeout: 3000,
  })
  // Keep subsequent connection attempts down and let the immediate disconnect refresh finish.
  await page.routeWebSocket('**/ws', () => {})
  const fallbackRead = page.waitForResponse((response) =>
    response.url().endsWith('/admin/booths/7/waitings'),
  )
  stomp.disconnect()
  await fallbackRead
  await expect(page.getByText('실시간 연결 대기 · 주기적으로 갱신 중')).toBeVisible()
  state.tickets = []
  await expect(page.getByText('현재 대기 중인 팀이 없어요.')).toBeVisible({ timeout: 8000 })
})
