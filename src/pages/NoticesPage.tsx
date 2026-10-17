import { useNotificationApi } from '../hooks/useNotificationApi'
import { useAction, useResource } from '../hooks/useResource'
import { RequestState } from '../components/RequestState'
import { seoulDate } from '../apis/adapters'
import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useFestival } from '../app/festival-context'
import { Page, BottomActions } from '../components/layout'
import { Asset, Card, Chips, EmptyState } from '../components/ui'
import { EmergencyBanner } from '../components/festival'
import { figmaAssets as assets } from '../data/figma-assets'
import { noticeCategories } from '../data/models'
import type { Notice } from '../data/models'
import { NotFoundPage } from './UtilityPages'

function NoticeRows({
  items,
  admin = false,
  notifications = false,
  read = false,
  onRead,
  children,
}: {
  items: Notice[]
  admin?: boolean
  notifications?: boolean
  read?: boolean
  onRead?: (id: string) => void
  children?: ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      {items.map((item) => (
        <Link
          key={item.id}
          to={admin ? `/admin/notices/${item.id}/edit` : `/notices/${item.id}`}
          onClick={() => onRead?.(item.id)}
          className={`flex min-h-[50px] items-center gap-2 border-b border-[#eee] px-4 py-2 last:border-0 ${notifications && !read && item.unread ? 'bg-[#57aa5a]/15' : ''}`}
        >
          <span
            className={`w-[3px] self-stretch ${notifications && (read || !item.unread) ? 'bg-[#d4d4d4]' : item.unread && !read ? 'bg-brand' : 'bg-[#383838]'}`}
          />
          {!read && item.unread && (
            <span className="flex size-[19px] shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              N
            </span>
          )}
          <div
            className={`min-w-0 flex-1 ${notifications && (read || !item.unread) ? 'text-[#d4d4d4]' : 'text-[#383838]'}`}
          >
            <h2 className="text-sm font-bold">{item.title}</h2>
            <p className="mt-1 flex items-center gap-2 text-[10px] font-medium">
              {item.date}
              <span className="rounded-full bg-[#eee] px-1 text-[6px]">{item.category}</span>
            </p>
          </div>
          <Asset src={assets['42:751'].imgFrame1597881181} />
        </Link>
      ))}
      {children}
    </Card>
  )
}
export function NoticesPage({ admin = false }: { admin?: boolean }) {
  const { notices } = useFestival()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || '전체'
  const urgent = notices.find((n) => n.category === '긴급')
  const rows = notices.filter(
    (n) => n.id !== urgent?.id && (category === '전체' || n.category === category),
  )
  return (
    <Page
      title={admin ? '공지사항 등록' : '전체 공지사항'}
      back={admin ? '/admin' : '/'}
      className={admin ? 'pb-28' : ''}
    >
      <div className="page-pad !gap-3">
        {urgent && <EmergencyBanner notice={urgent} admin={admin} />}
        <Chips
          options={noticeCategories}
          value={category}
          onChange={(v) => setParams({ category: v }, { replace: true })}
        />
        {rows.length ? (
          <NoticeRows items={rows} admin={admin} />
        ) : (
          <EmptyState>해당 분류의 공지가 없어요.</EmptyState>
        )}
      </div>
      {admin && (
        <BottomActions>
          <Link to="/admin/notices/new" className="primary-button green-gradient">
            공지 등록하기
          </Link>
        </BottomActions>
      )}
    </Page>
  )
}
export function NoticeDetailPage() {
  const { id } = useParams()
  const { notices } = useFestival()
  const item = notices.find((n) => n.id === id)
  if (!item) return <NotFoundPage />
  return (
    <Page title="공지사항" back="/notices">
      <div className="page-pad !gap-3 !pt-[22px]">
        <section
          className={`${item.category === '긴급' ? 'red-gradient' : 'green-gradient'} rounded-xl p-3.5 text-white shadow-card`}
        >
          <p className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-white/45 px-2 py-px font-bold">{item.category}</span>
            {item.date}
          </p>
          <h2 className="mt-2 text-lg font-bold">{item.title}</h2>
        </section>
        <Card className="p-4">
          <p className="whitespace-pre-line text-xs">{item.body}</p>
        </Card>
      </div>
    </Page>
  )
}
const notificationDate = (value: string) => {
  const day = seoulDate(value).slice(5).replace('-', '.')
  const time = new Date(value).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${day}. ${time}`
}

export function NotificationsPage() {
  const [page, setPage] = useState(0)
  const loader = useCallback(async () => (await useNotificationApi.findAll(page)).data.data, [page])
  const resource = useResource(loader, 10000)
  const action = useAction()
  const { notices, refresh } = useFestival()
  const navigate = useNavigate()
  return (
    <Page
      title="알림함"
      className="-mt-1.5 min-h-[calc(100dvh-62px)] bg-[url('/assets/figma/47-1047-5c849.svg'),linear-gradient(white,white)]"
      action={
        <button
          disabled={action.pending || !resource.data?.unreadCount}
          className="text-xs font-bold text-brand underline disabled:opacity-50"
          onClick={() =>
            void action.run(async () => {
              await useNotificationApi.readAll()
              await resource.refresh()
              void refresh()
            })
          }
        >
          전체 읽음
        </button>
      }
    >
      <div className="page-pad !gap-3">
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
        <RequestState error={action.error} />
        {resource.data && (
          <p role="status" aria-live="polite" className="sr-only">
            읽지 않은 알림 {resource.data.unreadCount}개
          </p>
        )}
        {!!resource.data?.content.length && (
          <Card className="overflow-hidden">
            <ul aria-label="알림 목록">
              {resource.data.content.map((item) => {
                const unread = !item.readAt
                const to = item.noticeId ? `/notices/${item.noticeId}` : '/waiting'
                const category =
                  item.type === 'NOTICE'
                    ? notices.find((notice) => notice.id === String(item.noticeId))?.category ||
                      '공지'
                    : null
                return (
                  <li
                    key={item.notificationId}
                    className="border-b-[0.5px] border-[#d9d9d9] last:border-0"
                  >
                    <Link
                      to={to}
                      aria-busy={action.pending || undefined}
                      onClick={(event) => {
                        if (action.pending) {
                          event.preventDefault()
                          return
                        }
                        if (!unread) return
                        event.preventDefault()
                        void action.run(async () => {
                          await useNotificationApi.read(item.notificationId)
                          await resource.refresh()
                          void refresh()
                          navigate(to)
                        })
                      }}
                      className={`flex min-h-[49px] items-center gap-2.5 px-4 py-2 ${unread ? 'bg-[#57aa5a]/15 text-[#383838]' : 'text-[#d4d4d4]'}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-[33px] w-[3px] shrink-0 ${unread ? 'bg-[#383838]' : 'bg-[#d4d4d4]'}`}
                      />
                      {unread && (
                        <span
                          aria-label="읽지 않음"
                          className="flex size-[19px] shrink-0 items-center justify-center rounded-full bg-brand text-[11.875px] font-bold text-white"
                        >
                          N
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm leading-[17px] font-bold">{item.title}</h2>
                        <div className="mt-1 flex items-center gap-2 text-[10px] leading-3 font-medium">
                          <time dateTime={item.createdAt}>{notificationDate(item.createdAt)}</time>
                          {unread && category && (
                            <span className="flex h-[12.262px] items-center rounded-full bg-[#eee] px-[4.598px] text-[7.664px] font-semibold text-[#383838]">
                              {category}
                            </span>
                          )}
                        </div>
                      </div>
                      <Asset src={assets['47:1047'].imgFrame1597881180} className="shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
        {resource.data?.content.length === 0 && <EmptyState>알림이 없습니다.</EmptyState>}
        {resource.data && resource.data.totalPages > 1 && (
          <div className="flex justify-between text-sm">
            <button disabled={page === 0 || action.pending} onClick={() => setPage((p) => p - 1)}>
              이전
            </button>
            <span>
              {page + 1} / {resource.data.totalPages}
            </span>
            <button
              disabled={page + 1 >= resource.data.totalPages || action.pending}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </Page>
  )
}
