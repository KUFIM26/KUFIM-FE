import { expect, test } from '@playwright/test'
import { mockApi } from './api-fixture'

for (const item of [
  {
    type: 'notice',
    path: '/admin/notices/4/edit',
    list: '/admin/notices',
    label: '공지사항 삭제하기',
    name: '서버 공지',
    field: '공지 제목',
    api: '/admin/notices/4',
    create: '/admin/notices/new',
  },
  {
    type: 'performance',
    path: '/admin/performances/9/edit',
    list: '/admin/performances',
    label: '무대 프로그램 삭제하기',
    name: '서버 밴드',
    field: '무대 팀명',
    api: '/admin/performances/9',
    create: '/admin/performances/new',
  },
]) {
  test(`${item.type} delete requires confirmation and returns to the refreshed list`, async ({
    page,
  }) => {
    const state = await mockApi(page, { loggedIn: true })
    await page.goto(item.path)
    await page.getByRole('button', { name: item.label, exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText(item.name)
    await dialog.getByRole('button', { name: '취소', exact: true }).click()
    expect(state.deletions).toEqual([])
    await expect(page.getByLabel(item.field, { exact: true })).toHaveValue(item.name)
    await page.getByRole('button', { name: item.label, exact: true }).click()
    await dialog.getByRole('button', { name: '삭제하기', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${item.list}(\\?.*)?$`))
    expect(state.deletions).toEqual([item.api])
    await expect(page.getByRole('link', { name: new RegExp(item.name) })).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('link', { name: new RegExp(item.name) })).toHaveCount(0)
  })

  test(`${item.type} failed deletion keeps edits and allows retry`, async ({ page }) => {
    const state = await mockApi(page, { loggedIn: true })
    state.failDelete = true
    await page.goto(item.path)
    await page.getByLabel(item.field, { exact: true }).fill('수정 중인 제목')
    await page.getByRole('button', { name: item.label, exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: '삭제하기', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('삭제 실패 테스트')
    await expect(page).toHaveURL(item.path)
    await expect(page.getByLabel(item.field, { exact: true })).toHaveValue('수정 중인 제목')
    state.failDelete = false
    await page.getByRole('button', { name: item.label, exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: '삭제하기', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${item.list}(\\?.*)?$`))
    expect(state.deletions).toEqual([item.api, item.api])
  })

  test(`${item.type} create form has no delete button`, async ({ page }) => {
    await mockApi(page, { loggedIn: true })
    await page.goto(item.create)
    await expect(page.getByRole('button', { name: item.label, exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '저장하기', exact: true })).toBeVisible()
  })
}
