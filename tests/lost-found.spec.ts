import { test, expect } from '@playwright/test'
import { mockApi } from './api-fixture'
import type { AdminLostItem } from '../src/apis/lostItem'

// 1x1 PNG. 사진 요청과 업로드에 쓴다.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)
const base: AdminLostItem = {
  lostItemId: 1,
  category: 'ELECTRONICS',
  name: '검은색 에어팟 케이스',
  status: 'STORED',
  createdAt: '2026-11-11T17:45:00+09:00',
  foundPlace: '노천극장 객석 왼쪽 계단',
  foundAt: '2026-11-11T17:40:00+09:00',
  storagePlace: '상황실',
  description: '노란색 스티커가 붙어 있어요.',
  imageUrl: '/api/v1/lost-items/1/image?size=full',
  thumbnailUrl: '/api/v1/lost-items/1/image?size=thumb',
  elapsedMinutes: 12,
  imagePublic: true,
  registeredBy: { accountId: 1, name: '총괄 관리자' },
  returnedAt: null,
  returnedBy: null,
  receiverName: null,
  receiverPhoneMasked: null,
  verifiedBy: null,
  returnNote: null,
}

async function lostItems(page: import('@playwright/test').Page, admin = false) {
  await mockApi(page, { loggedIn: admin })
  const items: AdminLostItem[] = [
    { ...base },
    {
      ...base,
      lostItemId: 2,
      category: 'ID_CARD',
      name: '김*국 학생증',
      foundPlace: '대운동장 입구',
      description: null,
      imageUrl: null,
      thumbnailUrl: null,
      imagePublic: false,
      elapsedMinutes: 180,
    },
    {
      ...base,
      lostItemId: 3,
      category: 'CLOTHING',
      name: '회색 에코백',
      status: 'RETURNED',
      elapsedMinutes: 2880,
    },
  ]
  const calls: string[] = []
  const queries: URLSearchParams[] = []
  // 방문자 응답: 인계 완료된 물건은 이름·분류·상태만 남긴다.
  const visitor = (item: AdminLostItem) => ({
    lostItemId: item.lostItemId,
    category: item.category,
    name: item.name,
    status: item.status,
    createdAt: item.createdAt,
    ...(item.status === 'RETURNED'
      ? {
          foundPlace: null,
          foundAt: null,
          storagePlace: null,
          description: null,
          imageUrl: null,
          thumbnailUrl: null,
          elapsedMinutes: null,
        }
      : {
          foundPlace: item.foundPlace,
          foundAt: item.foundAt,
          storagePlace: item.storagePlace,
          description: item.description,
          imageUrl: item.imagePublic ? item.imageUrl : null,
          thumbnailUrl: item.imagePublic ? item.thumbnailUrl : null,
          elapsedMinutes: item.elapsedMinutes,
        }),
  })
  await page.route('**/api/v1/**lost-items**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()
    calls.push(`${method} ${path}`)
    const ok = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { success: true, data, error: null } })
    const missing = () =>
      route.fulfill({
        status: 404,
        json: {
          success: false,
          data: null,
          error: { code: 'L001', message: '습득물을 찾을 수 없습니다.' },
        },
      })
    const isAdmin = path.startsWith('/admin/')
    const id = Number(path.match(/lost-items\/(\d+)/)?.[1])
    const item = items.find((i) => i.lostItemId === id)
    if (path.endsWith('/image')) return route.fulfill({ contentType: 'image/png', body: png })
    if (path.endsWith('/images')) {
      expect(request.headers()['content-type']).toContain('multipart/form-data')
      return ok({ imageKey: 'lost-items/2026/test.jpg' }, 201)
    }
    if (path.endsWith('/lost-items') && method === 'GET') {
      queries.push(url.searchParams)
      const status = url.searchParams.get('status')
      const category = url.searchParams.get('category')
      const q = url.searchParams.get('q')
      const content = items.filter(
        (i) =>
          (isAdmin ? !status || i.status === status : status === 'ALL' || i.status === 'STORED') &&
          (!category || i.category === category) &&
          (!q || i.name.includes(q)),
      )
      return ok({
        content: isAdmin ? content : content.map(visitor),
        page: 0,
        totalPages: 1,
        totalElements: content.length,
        ...(isAdmin && {
          summary: {
            stored: items.filter((i) => i.status === 'STORED').length,
            returned: items.filter((i) => i.status === 'RETURNED').length,
            total: items.length,
          },
        }),
      })
    }
    if (path.endsWith('/lost-items') && method === 'POST') {
      const created = {
        ...base,
        ...request.postDataJSON(),
        lostItemId: 9,
        imageUrl: '/api/v1/admin/lost-items/9/image?size=full',
        thumbnailUrl: '/api/v1/admin/lost-items/9/image?size=thumb',
      }
      items.unshift(created)
      return ok(created, 201)
    }
    if (!item) return missing()
    if (path.endsWith('/return')) {
      const body = request.postDataJSON()
      Object.assign(item, {
        status: 'RETURNED',
        returnedAt: '2026-11-11T18:05:00+09:00',
        returnedBy: { accountId: 1, name: '총괄 관리자' },
        receiverName: body.receiverName,
        receiverPhoneMasked: body.receiverPhone ? '010-****-1234' : null,
        verifiedBy: body.verifiedBy,
        returnNote: body.returnNote || null,
      })
      return ok(item)
    }
    if (path.endsWith('/reopen')) {
      Object.assign(item, { status: 'STORED', returnedAt: null, receiverName: null })
      return ok(item)
    }
    if (path.endsWith('/contact')) return ok({ phoneNumber: '01012341234' })
    if (method === 'DELETE') {
      items.splice(items.indexOf(item), 1)
      return route.fulfill({ status: 204 })
    }
    if (method === 'PATCH') return ok(Object.assign(item, request.postDataJSON()))
    if (!isAdmin && item.status === 'RETURNED') return missing()
    return ok(isAdmin ? item : visitor(item))
  })
  return { items, calls, queries }
}
const fits = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

test('visitor: list, filters, private photo, returned items stay closed', async ({ page }) => {
  const { queries } = await lostItems(page)
  await page.goto('/menu')
  await page.getByRole('link', { name: '분실물센터' }).click()
  await expect(page.getByRole('heading', { name: '검은색 에어팟 케이스' })).toBeVisible()
  await expect(page.getByText('습득물 2건')).toBeVisible()
  await expect(page.getByText('회색 에코백')).toHaveCount(0)
  expect(await fits(page)).toBe(true)
  await page.screenshot({ path: 'test-results/lost-l1.png', fullPage: true })

  // 인계 완료된 물건은 스위치를 꺼야 보이고, 링크가 아니다.
  await page.getByText('보관 중만 보기').click()
  await expect(page.getByText('회색 에코백')).toBeVisible()
  await expect(page.getByText('주인에게 돌아갔어요')).toBeVisible()
  await expect(page.getByRole('link', { name: /회색 에코백/ })).toHaveCount(0)
  expect(queries.at(-1)?.get('status')).toBe('ALL')

  await page.getByRole('button', { name: '신분증' }).click()
  await expect(page.getByRole('heading', { name: '검은색 에어팟 케이스' })).toHaveCount(0)
  expect(queries.at(-1)?.get('category')).toBe('ID_CARD')

  // 사진이 비공개인 물건은 상세에 사진 영역이 없다.
  await page.getByRole('link', { name: /김\*국 학생증/ }).click()
  await expect(page).toHaveURL(/\/lost-found\/2$/)
  await expect(page.getByText('대운동장 입구')).toBeVisible()
  await expect(page.locator('.lost-photo')).toHaveCount(0)
  await expect(page.getByText('분 전')).toHaveCount(0)
  await expect(page.getByRole('link', { name: '상황실 전화하기' })).toHaveAttribute(
    'href',
    'tel:024503990',
  )
  await page.screenshot({ path: 'test-results/lost-l3.png', fullPage: true })

  await page.goto('/lost-found/1')
  await expect(page.locator('.lost-photo img')).toBeVisible()
  await expect(page.getByText('11.11. 17:40', { exact: true })).toBeVisible()
  expect(await fits(page)).toBe(true)
  await page.screenshot({ path: 'test-results/lost-l2.png', fullPage: true })

  // 주소로 직접 들어와도 인계 완료된 물건의 내용은 보이지 않는다.
  await page.goto('/lost-found/3')
  await expect(page.getByText('찾을 수 없는 습득물이에요')).toBeVisible()
  await expect(page.getByText('회색 에코백')).toHaveCount(0)
})

test('visitor: search waits for two characters and empty state leads to a report', async ({
  page,
}) => {
  const { queries } = await lostItems(page)
  await page.goto('/lost-found')
  await expect(page.getByText('습득물 2건')).toBeVisible()
  const before = queries.length
  await page.getByRole('searchbox', { name: '습득물 검색' }).fill('버')
  await page.waitForTimeout(500)
  expect(queries.length).toBe(before)
  await page.getByRole('searchbox', { name: '습득물 검색' }).fill('갤럭시 버즈')
  await expect(page.getByText('조건에 맞는 습득물이 없어요')).toBeVisible()
  expect(queries.at(-1)?.get('q')).toBe('갤럭시 버즈')
  await page.screenshot({ path: 'test-results/lost-l4.png', fullPage: true })
  await page.getByRole('link', { name: '분실 신고하기' }).click()
  await expect(page).toHaveURL(/\/report\/new\?category=LOST_ITEM$/)
  await expect(page.getByRole('button', { name: '분실물' })).toHaveAttribute('aria-pressed', 'true')
})

test('admin: register with a photo, hand over, reveal contact, reopen and delete', async ({
  page,
}) => {
  const { items, calls } = await lostItems(page, true)
  await page.goto('/admin')
  await page.getByRole('link', { name: '분실물센터 관리' }).click()
  await expect(page.getByText('검은색 에어팟 케이스')).toBeVisible()
  await expect(page.locator('.report-count-number')).toHaveText(['02', '01', '03'])
  expect(await fits(page)).toBe(true)
  await page.screenshot({ path: 'test-results/lost-a1.png', fullPage: true })

  await page.getByRole('link', { name: '습득물 등록' }).click()
  const submit = page.getByRole('button', { name: '등록하기' })
  await expect(submit).toBeDisabled()
  await expect(page.getByPlaceholder('30자 이내').first()).toBeVisible()
  await page.screenshot({ path: 'test-results/lost-a2-empty.png', fullPage: true })
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'item.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByRole('button', { name: '사진 지우기' })).toBeVisible()
  const photo = await page.locator('.lost-photo').boundingBox()
  const field = await page.getByPlaceholder('50자 이내').boundingBox()
  expect(Math.round(photo!.width)).toBe(Math.round(field!.width))

  // 신분증을 고르면 사진 공개 스위치가 꺼진 채로 잠긴다.
  await page.getByRole('button', { name: '신분증' }).click()
  await expect(page.getByRole('checkbox')).toBeDisabled()
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  await page.getByRole('button', { name: '전자기기' }).click()
  await expect(page.getByRole('checkbox')).toBeChecked()

  await page.getByPlaceholder('30자 이내').first().fill('갈색 반지갑')
  await page.getByPlaceholder('50자 이내').fill('학생회관 앞')
  await page.locator('input[type=datetime-local]').fill('2026-11-11T17:40')
  await page.getByPlaceholder('300자 이내').fill('카드가 들어 있습니다.')
  expect(await fits(page)).toBe(true)
  await page.screenshot({ path: 'test-results/lost-a2-filled.png', fullPage: true })
  const created = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().endsWith('/admin/lost-items'),
  )
  await submit.click()
  expect((await created).postDataJSON()).toMatchObject({
    category: 'ELECTRONICS',
    name: '갈색 반지갑',
    foundAt: '2026-11-11T17:40:00+09:00',
    storagePlace: '상황실',
    imageKey: 'lost-items/2026/test.jpg',
    imagePublic: true,
  })
  expect(calls).toContain('POST /admin/lost-items/images')
  await expect(page).toHaveURL(/\/admin\/lost-items\/9$/)
  await expect(page.getByRole('heading', { name: '갈색 반지갑' })).toBeVisible()
  await page.screenshot({ path: 'test-results/lost-a3.png', fullPage: true })

  await page.getByRole('button', { name: '인계 완료 처리' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('10자 이내').fill('김건국')
  await dialog.getByPlaceholder('숫자 11자리').fill('010-1234-1234')
  await dialog.getByPlaceholder('100자 이내').fill('학생증 확인')
  await page.screenshot({ path: 'test-results/lost-a4.png' })
  await dialog.getByRole('button', { name: '완료 처리' }).click()
  await expect(page.getByText('인계 완료로 처리했습니다.')).toBeVisible()
  expect(items[0]).toMatchObject({ status: 'RETURNED', receiverName: '김건국' })
  await expect(page.getByRole('link', { name: '수정' })).toHaveCount(0)
  await expect(page.getByText('01012341234')).toHaveCount(0)
  await page.getByRole('button', { name: '연락처 보기' }).click()
  await expect(page.getByText('01012341234')).toBeVisible()
  await page.screenshot({ path: 'test-results/lost-a5.png', fullPage: true })

  await page.getByRole('button', { name: '인계 취소' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '인계 취소' }).click()
  await expect(page.getByText('보관 중으로 되돌렸습니다.')).toBeVisible()
  expect(items[0].status).toBe('STORED')

  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '삭제하기' }).click()
  await expect(page).toHaveURL(/\/admin\/lost-items$/)
  expect(items.some((i) => i.lostItemId === 9)).toBe(false)
})

test('admin: editing keeps the stored photo unless it is changed or removed', async ({ page }) => {
  await lostItems(page, true)
  await page.goto('/admin/lost-items/1/edit')
  await expect(page.getByPlaceholder('30자 이내').first()).toHaveValue('검은색 에어팟 케이스')
  await expect(page.locator('input[type=datetime-local]')).toHaveValue('2026-11-11T17:40')
  const kept = page.waitForRequest((r) => r.method() === 'PATCH')
  await page.getByRole('button', { name: '저장하기' }).click()
  expect((await kept).postDataJSON()).not.toHaveProperty('imageKey')

  await page.goto('/admin/lost-items/1/edit')
  await page.getByRole('button', { name: '사진 지우기' }).click()
  await expect(page.getByText('사진 추가')).toBeVisible()
  const removed = page.waitForRequest((r) => r.method() === 'PATCH')
  await page.getByRole('button', { name: '저장하기' }).click()
  expect((await removed).postDataJSON()).toMatchObject({ imageKey: null })
})
