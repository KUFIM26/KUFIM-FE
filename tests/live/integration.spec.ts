import { expect, test } from '@playwright/test'

test('real Spring Boot session, catalog saves, QR, registration, restoration, call and entry', async ({
  page,
  browser,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/admin')
  await expect(page).toHaveURL(/admin\/login/)
  await page.getByLabel('아이디', { exact: true }).fill('e2e-admin')
  await page.getByLabel('비밀번호', { exact: true }).fill('throwaway-e2e-password')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page.getByRole('heading', { name: '관리자 메뉴' })).toBeVisible()
  const csrf = (await page.context().cookies()).find((c) => c.name === 'XSRF-TOKEN')!.value
  const post = async (path: string, data: unknown) => {
    const r = await page.request.post(`/api/v1${path}`, { data, headers: { 'X-XSRF-TOKEN': csrf } })
    expect(r.ok(), await r.text()).toBe(true)
    return (await r.json()).data
  }
  const festival = await post('/admin/festivals', {
    name: '실서버 연동 축제',
    startAt: '2026-10-09T09:00:00+09:00',
    endAt: '2026-10-11T23:00:00+09:00',
    location: '건국대학교',
  })
  await post('/admin/map/floorplans', {
    festivalId: festival.festivalId,
    imageUrl: '/assets/figma/53-1227-a5341.png',
    width: 800,
    height: 800,
  })
  const stage = await post('/admin/stages', { festivalId: festival.festivalId, name: '호수 무대' })
  const booth = await post('/admin/booths', {
    festivalId: festival.festivalId,
    name: '통합 테스트 부스',
    organizerType: 'STUDENT_COUNCIL',
    period: 'DAY',
    place: '청심대',
    description: '실제 DB의 부스',
    operatingHours: '09:00~17:00',
    waitingEnabled: true,
  })
  const qr = await post(`/admin/booths/${booth.boothId}/qr`, {})
  await page.goto('/admin/notices/new')
  await page.getByRole('button', { name: '안내', exact: true }).click()
  await page.getByRole('textbox', { name: '공지 제목', exact: true }).fill('실서버 저장 공지')
  await page
    .getByRole('textbox', { name: '공지 내용', exact: true })
    .fill('쿠키와 CSRF로 저장한 내용')
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await expect(page).toHaveURL(/admin\/notices$/)
  await page.reload()
  await page.getByRole('link', { name: /실서버 저장 공지/ }).click()
  await expect(page.getByRole('textbox', { name: '공지 내용', exact: true })).toHaveValue(
    '쿠키와 CSRF로 저장한 내용',
  )
  await page.goto('/admin/performances/new')
  await page.getByRole('textbox', { name: '무대 팀명', exact: true }).fill('실서버 밴드')
  await page.getByLabel('공연 시작 시간').selectOption('14:00')
  await page.getByLabel('공연 종료 시간').selectOption('15:00')
  await page.getByRole('textbox', { name: '공연 소개', exact: true }).fill('공연 저장 검증')
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await expect(page).toHaveURL(/admin\/performances\?/)
  const performances = await page.request.get('/api/v1/performances')
  const performance = (await performances.json()).data[0]
  expect(performance.stageId).toBe(stage.stageId)
  await page.goto(`/admin/booths/${booth.boothId}/edit`)
  await expect(page.getByRole('textbox', { name: '부스 소개', exact: true })).toHaveValue(
    '실제 DB의 부스',
  )
  await page.getByRole('textbox', { name: '부스 소개', exact: true }).fill('수정된 부스 소개')
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await expect(page).toHaveURL(/admin\/booths\?period=day/)
  const savedBooth = await page.request.get(`/api/v1/booths/${booth.boothId}`)
  expect((await savedBooth.json()).data.description).toBe('수정된 부스 소개')

  await page.goto('/admin/booths/new?period=facility')
  await page.getByRole('textbox', { name: '시설 명', exact: true }).fill('테스트 상황실')
  await page.getByRole('textbox', { name: '시설 장소', exact: true }).fill('학생회관')
  await page.getByRole('button', { name: '지도에서 위치 지정', exact: true }).click()
  await page.getByRole('button', { name: '지도에서 위치 선택', exact: true }).press('ArrowRight')
  await page.getByRole('button', { name: '지정하기', exact: true }).click()
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await expect(page).toHaveURL(/admin\/booths\?period=facility/)
  const facilities = await page.request.get('/api/v1/facilities')
  expect((await facilities.json()).data[0].pin).toEqual({ xPercent: 52, yPercent: 50 })
  await page.goto('/map?facility=상황실')
  await expect(page.getByRole('link', { name: '테스트 상황실 위치', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('map.png'), fullPage: true })
  await page.goto(`/admin/waiting/${booth.boothId}/settings`)
  await expect(page.getByAltText(/웨이팅 접수 QR 코드/)).toBeVisible()
  expect(
    await page
      .getByAltText(/웨이팅 접수 QR 코드/)
      .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 512),
  ).toBe(true)
  await page.getByLabel('1팀당 예상 대기 시간 (분)').fill('3')
  await page.getByRole('button', { name: '저장하기', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/waiting/${booth.boothId}$`))

  const visitor = await browser.newContext({
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 393, height: 898 },
  })
  const user = await visitor.newPage()
  user.on('pageerror', (e) => errors.push(e.message))
  await user.goto(new URL(qr.url).pathname)
  await expect(user).toHaveURL(new RegExp(`/waiting/register/${booth.boothId}$`))
  await user.getByLabel('학번', { exact: true }).fill('202300012')
  await user.getByLabel('전화번호', { exact: true }).fill('01012341234')
  await user.getByRole('combobox', { name: '인원 수' }).selectOption('2')
  await user.getByLabel('동의합니다', { exact: true }).check()
  await user.getByRole('button', { name: '웨이팅 접수하기', exact: true }).click()
  await expect(user).toHaveURL(/\/waiting$/)
  await expect(user.getByText('1번', { exact: true })).toBeVisible()
  await user.reload()
  await expect(user.getByText('1번', { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: '호출하기', exact: true }).click()
  await expect(page.getByRole('button', { name: '재호출', exact: true })).toBeVisible()
  await expect(user.getByRole('heading', { name: '호출됨', exact: true })).toBeVisible({
    timeout: 12000,
  })
  await page.screenshot({ path: testInfo.outputPath('admin-called.png'), fullPage: true })
  await user.screenshot({ path: testInfo.outputPath('visitor-called.png'), fullPage: true })
  await user.goto('/notifications')
  await expect(user.getByRole('heading', { name: '부스 입장 호출' })).toBeVisible()
  await user.getByRole('button', { name: '전체 읽음' }).click()
  await expect(user.getByText('읽지 않은 알림 0개')).toBeVisible()
  await page.getByRole('button', { name: '입장 완료', exact: true }).click()
  await expect(page.getByText('현재 대기 중인 팀이 없어요.')).toBeVisible()
  await user.goto('/waiting')
  await expect(user.getByText('아직 신청한 웨이팅이 없어요.')).toBeVisible()
  await visitor.close()
  expect(errors).toEqual([])
})
