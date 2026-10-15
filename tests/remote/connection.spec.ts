import { expect, test } from '@playwright/test'

test('public screens use deployed data and the real STOMP broker', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  let connected = false
  page.on('websocket', (socket) =>
    socket.on('framereceived', ({ payload }) => {
      if (String(payload).includes('CONNECTED')) connected = true
    }),
  )
  await page.goto('/')
  const festivalResponse = await page.request.get('/api/v1/festival')
  expect(festivalResponse.ok()).toBe(true)
  const festival = (await festivalResponse.json()).data
  await expect(page.getByRole('heading', { name: festival.name, exact: true })).toBeVisible()
  await expect(page.getByText(/목업 모드/)).toHaveCount(0)
  await expect.poll(() => connected).toBe(true)
  await page.goto('/booths')
  const booths = (await (await page.request.get('/api/v1/booths')).json()).data
  for (const booth of booths.filter((b: { period: string }) => b.period === 'DAY')) {
    await expect(page.getByRole('heading', { name: booth.name, exact: true })).toBeVisible()
  }
  await page.goto('/map')
  await expect(page.getByAltText('축제 지도')).toBeVisible()
  expect(
    await page
      .getByAltText('축제 지도')
      .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
  ).toBe(true)
  for (const path of ['/performances', '/notices', '/waiting', '/notifications']) {
    await page.goto(path)
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByText('불러오는 중…', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})

test('admin session cookies, CSRF, protected lists and QR downloads work through the proxy', async ({
  page,
}) => {
  const login = process.env.KUFIM_TEST_ADMIN_LOGIN
  const password = process.env.KUFIM_TEST_ADMIN_PASSWORD
  test.skip(
    !login || !password,
    'Provide test administrator credentials through environment variables.',
  )
  await page.goto('/admin/login')
  await page.getByLabel('아이디', { exact: true }).fill(login!)
  await page.getByLabel('비밀번호', { exact: true }).fill(password!)
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page.getByRole('heading', { name: '관리자 메뉴', exact: true })).toBeVisible()
  const cookies = await page.context().cookies()
  expect(cookies.some((cookie) => cookie.name === 'KUFIMSESSION' && cookie.httpOnly)).toBe(true)
  expect(cookies.some((cookie) => cookie.name === 'XSRF-TOKEN')).toBe(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: '관리자 메뉴', exact: true })).toBeVisible()
  for (const path of ['/admin/booths', '/admin/notices', '/admin/performances', '/admin/waiting']) {
    await page.goto(path)
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  }
  const boothResponse = await page.request.get('/api/v1/admin/booths')
  const booths = (await boothResponse.json()).data
  const waitingBooth = booths.find((booth: { waitingEnabled: boolean }) => booth.waitingEnabled)
  if (waitingBooth) {
    await page.goto(`/admin/waiting/${waitingBooth.boothId}`)
    await expect(page.getByText('실시간 연결됨', { exact: true })).toBeVisible()
    await page.goto(`/admin/waiting/${waitingBooth.boothId}/settings`)
    await expect(page.getByText('불러오는 중…', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
  }
  // Use the browser UI so Axios supplies cookies, CSRF and the local Origin.
  await page.goto('/admin')
  const loggedOut = page.waitForResponse((response) =>
    response.url().endsWith('/admin/auth/logout'),
  )
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  expect((await loggedOut).status()).toBe(204)
  await expect(page).toHaveURL(/admin\/login/)
  expect((await page.request.get('/api/v1/admin/auth/me')).status()).toBe(401)
})
