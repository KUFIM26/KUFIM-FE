import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useDemo } from '../app/demo-context'
import { Page, BottomActions } from '../components/layout'
import { Asset, Card, Chips, EmptyState } from '../components/ui'
import { EmergencyBanner } from '../components/festival'
import { figmaAssets as assets } from '../data/figma-assets'
import { noticeCategories } from '../data/mock'
import type { Notice } from '../data/mock'
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
  const { notices } = useDemo()
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
          compact
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
  const { notices } = useDemo()
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
export function NotificationsPage() {
  const { notices, setNotices } = useDemo()
  const [allRead, setAllRead] = useState(false)
  const markRead = (id: string) => {
    setNotices((items) =>
      items.map((n) => (n.id === id ? { ...n, unread: false, notificationUnread: false } : n)),
    )
  }
  const items = notices
    .filter((n) => n.category !== '긴급')
    .slice(0, 3)
    .map((item) => ({ ...item, unread: !allRead && (item.notificationUnread ?? item.unread) }))
  return (
    <Page
      title="알림함"
      action={
        <button
          type="button"
          onClick={() => {
            setAllRead(true)
            setNotices((items) =>
              items.map((n) => ({ ...n, unread: false, notificationUnread: false })),
            )
          }}
          className="text-xs font-bold text-brand underline"
        >
          전체 읽음
        </button>
      }
    >
      <div className="page-pad">
        <NoticeRows items={items} notifications read={allRead} onRead={markRead}>
          <Link
            to="/waiting"
            className="flex min-h-[50px] items-center gap-2 px-4 py-2 text-[#d4d4d4]"
          >
            <span className="w-[3px] self-stretch bg-[#d4d4d4]" />
            <div className="flex-1">
              <p className="text-sm font-bold">“000” 부스에 입장하실 시간입니다.</p>
              <p className="mt-1 text-[10px]">09.30. 14:00</p>
            </div>
            <Asset src={assets['47:1047'].imgFrame1597881180} />
          </Link>
        </NoticeRows>
      </div>
    </Page>
  )
}
