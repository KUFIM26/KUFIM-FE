import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mockApi } from './api-fixture'

// 서버가 영어 저장을 지원하는 상태를 흉내 낸다: 축제 응답에 nameEn 필드가 있다.
async function englishServer(page: Page, options: Parameters<typeof mockApi>[1] = {}) {
  const state = await mockApi(page, options)
  await page.route('**/api/v1/festival', (route) =>
    route.fulfill({
      json: {
        success: true,
        error: null,
        data: {
          festivalId: 1,
          name: '서버 축제',
          nameEn: 'Server Festival',
          location: '건국대학교',
          startAt: '2026-10-09T09:00:00+09:00',
          endAt: '2026-10-11T23:00:00+09:00',
          serverTime: '2026-10-09T14:30:00+09:00',
          summary: {
            operatingBoothCount: 1,
            todayPerformanceCount: 1,
            stageEntrySummary: [{ stageId: 3, entryStatus: 'OPEN' }],
          },
        },
      },
    }),
  )
  return state
}

test.describe('English device', () => {
  test.use({ locale: 'en-US' })

  test('staff-entered content is English when present and Korean when missing', async ({
    page,
  }) => {
    const state = await englishServer(page)
    Object.assign(state.booths[0], {
      nameEn: 'Test Booth',
      placeEn: 'Cheongsimdae Lake',
      descriptionEn: 'A booth run by the server.',
    })
    Object.assign(state.notices[0], { titleEn: 'Server notice', contentEn: 'Notice body' })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Server Festival' })).toBeVisible()
    // 공연에는 영어 제목이 없으므로 한국어 원문이 그대로 나온다.
    await expect(page.getByRole('heading', { name: '서버 밴드' }).first()).toBeVisible()

    await page.goto('/booths')
    await expect(page.getByRole('heading', { name: 'Test Booth' })).toBeVisible()
    await expect(page.getByText('Cheongsimdae Lake')).toBeVisible()
    await page.goto('/notices')
    await expect(page.getByRole('heading', { name: 'Server notice' })).toBeVisible()

    // 한국어로 바꾸면 목록을 다시 불러와 한국어 이름으로 돌아간다.
    await page.goto('/')
    await page.getByRole('button', { name: 'KO', exact: true }).click()
    await expect(page.getByRole('heading', { name: '서버 축제' })).toBeVisible()
    await page.goto('/booths')
    await expect(page.getByRole('heading', { name: '테스트 부스' })).toBeVisible()
  })
})

test('admin form: English field is filled by translation, kept when edited, and saved', async ({
  page,
}) => {
  await englishServer(page, { loggedIn: true })
  const translated: string[] = []
  await page.route('**/api/v1/admin/translate', (route) => {
    const body = route.request().postDataJSON()
    expect(body.target).toBe('EN')
    translated.push(...body.texts)
    return route.fulfill({
      json: {
        success: true,
        error: null,
        data: { translations: body.texts.map((text: string) => `EN(${text})`) },
      },
    })
  })
  await page.goto('/admin/notices/new')
  const title = page.getByPlaceholder('공지 제목을 입력하세요.(25자 이내)')
  const titleEn = page.getByRole('textbox', { name: '공지 제목', exact: true }).nth(1)
  await title.fill('우천 안내')
  await title.blur()
  await expect(titleEn).toHaveValue('EN(우천 안내)')

  // 운영진이 고친 영어는 한국어를 바꿔도 덮어쓰지 않는다.
  await titleEn.fill('Rain notice')
  await title.fill('우천 운영 안내')
  await title.blur()
  await expect(titleEn).toHaveValue('Rain notice')
  expect(translated).toEqual(['우천 안내'])

  // "다시 번역"을 눌렀을 때만 다시 가져온다.
  await page.getByRole('button', { name: '다시 번역' }).first().click()
  await expect(titleEn).toHaveValue('EN(우천 운영 안내)')
  await titleEn.fill('Rain schedule notice')

  await page.getByPlaceholder('공지 내용을 입력하세요.').fill('비가 와서 일정이 바뀝니다.')
  const saved = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().endsWith('/admin/notices'),
  )
  await page.getByRole('button', { name: '저장하기' }).click()
  const body = (await saved).postDataJSON()
  expect(body).toMatchObject({ title: '우천 운영 안내', titleEn: 'Rain schedule notice' })
  // 본문 영어는 한국어 칸에서 벗어날 때 자동으로 채워진 값이 저장된다.
  expect(body.contentEn).toBe('EN(비가 와서 일정이 바뀝니다.)')
})

test('admin form: translation failure lets staff type English, too-long English blocks saving', async ({
  page,
}) => {
  await englishServer(page, { loggedIn: true })
  await page.route('**/api/v1/admin/translate', (route) =>
    route.fulfill({
      status: 503,
      json: { success: false, data: null, error: { code: 'T001', message: '번역 불가' } },
    }),
  )
  await page.goto('/admin/notices/new')
  const title = page.getByPlaceholder('공지 제목을 입력하세요.(25자 이내)')
  await title.fill('우천 안내')
  await title.blur()
  await expect(page.getByText('자동 번역을 사용할 수 없습니다.').first()).toBeVisible()
  const titleEn = page.getByRole('textbox', { name: '공지 제목', exact: true }).nth(1)
  await titleEn.fill('x'.repeat(61))
  await expect(page.getByText('영어가 61자입니다. 60자 이내로 줄여 주세요.')).toBeVisible()
  await page.getByPlaceholder('공지 내용을 입력하세요.').fill('본문')
  await page.getByRole('button', { name: '저장하기' }).click()
  await expect(page).toHaveURL(/\/admin\/notices\/new$/)
})

test('admin form: no English fields until the server supports them', async ({ page }) => {
  await mockApi(page, { loggedIn: true })
  await page.goto('/admin/notices/new')
  await expect(page.getByPlaceholder('공지 제목을 입력하세요.(25자 이내)')).toBeVisible()
  await expect(page.getByRole('button', { name: '다시 번역' })).toHaveCount(0)
  const saved = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().endsWith('/admin/notices'),
  )
  await page.getByPlaceholder('공지 제목을 입력하세요.(25자 이내)').fill('공지')
  await page.getByPlaceholder('공지 내용을 입력하세요.').fill('본문')
  await page.getByRole('button', { name: '저장하기' }).click()
  expect((await saved).postDataJSON()).not.toHaveProperty('titleEn')
})
