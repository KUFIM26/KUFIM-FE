import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Asset, Card } from './ui'
import { lostItemCategories, lostItemStatuses, sensitiveCategories } from '../apis/lostItem'
import type { AdminLostItem, LostItem, LostItemStatus } from '../apis/lostItem'
import { reportAssets, reportDate, reportElapsed } from '../data/report-design'

export function LostItemBadge({ status }: { status: LostItemStatus }) {
  return <span className={`report-badge lost-status-${status}`}>{lostItemStatuses[status]}</span>
}

/** 사진이 없거나 비공개일 때 목록에서 자리를 채우는 그림. 문구는 넣지 않는다. */
function Placeholder({ locked, size = 40 }: { locked: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {locked ? (
        <>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
      ) : (
        <>
          <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16Z" />
          <path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" />
        </>
      )}
    </svg>
  )
}
function Thumb({ item, className = '' }: { item: LostItem; className?: string }) {
  const locked = sensitiveCategories.includes(item.category)
  return (
    <div className={`lost-thumb ${locked ? 'is-private' : ''} ${className}`}>
      {item.thumbnailUrl ? (
        <img src={item.thumbnailUrl} alt="" loading="lazy" draggable={false} />
      ) : (
        item.status === 'STORED' && <Placeholder locked={locked} />
      )}
    </div>
  )
}

/** 방문자 목록: 2열 사진 카드. 인계 완료된 물건은 눌리지 않는다. */
export function LostItemGrid({ items }: { items: LostItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const body = (
          <>
            <div className="relative">
              <Thumb item={item} className="h-[116px]" />
              <span className="absolute top-2 left-2">
                <LostItemBadge status={item.status} />
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-1 px-2.5 pt-2.5 pb-3">
              <h3 className="truncate text-sm font-bold text-[#1a1a1a]">{item.name}</h3>
              <p className="truncate text-[11px] font-medium text-[#6b6b6b]">
                {item.status === 'RETURNED'
                  ? '주인에게 돌아갔어요'
                  : [
                      item.foundPlace,
                      item.elapsedMinutes !== null && reportElapsed(item.elapsedMinutes),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </p>
            </div>
          </>
        )
        return (
          <li key={item.lostItemId} className="min-w-0">
            {item.status === 'STORED' ? (
              <Link to={`/lost-found/${item.lostItemId}`} className="card block overflow-hidden">
                {body}
              </Link>
            ) : (
              <div className="card overflow-hidden opacity-55">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function AdminLostItemRows({ items }: { items: AdminLostItem[] }) {
  return (
    <Card className="overflow-hidden">
      <ul>
        {items.map((item) => (
          <li key={item.lostItemId} className="border-b border-[#e8e8e8] last:border-0">
            <Link to={`/admin/lost-items/${item.lostItemId}`} className="report-row !px-3">
              <Thumb item={item} className="size-12 shrink-0 !rounded-[10px]" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-[#383838]">{item.name}</h3>
                <p className="mt-1 truncate text-[10px] text-muted">
                  {[
                    lostItemCategories[item.category],
                    item.foundPlace,
                    item.elapsedMinutes !== null && reportElapsed(item.elapsedMinutes),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <LostItemBadge status={item.status} />
              <Asset src={reportAssets.arrow} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** 상세 상단 요약 카드. 신고 요약 카드와 같은 형태다. */
export function LostItemSummary({ item, children }: { item: LostItem; children?: ReactNode }) {
  const returned = item.status === 'RETURNED'
  return (
    <section
      className={`rounded-xl p-3.5 text-white shadow-card ${returned ? 'bg-[#6f6f6f]' : 'green-gradient'}`}
    >
      <div className="mb-2 flex items-center gap-2.5">
        <span className="report-badge bg-white/50">{lostItemCategories[item.category]}</span>
        <time className="text-xs">{reportDate(item.createdAt)} 등록</time>
      </div>
      <h2 className="text-lg font-bold">{item.name}</h2>
      <p className="mt-2 text-xs font-semibold">{children ?? lostItemStatuses[item.status]}</p>
    </section>
  )
}

/** 라벨·값 줄을 한 카드에 묶는다. 값이 없는 줄은 건너뛴다. */
export function LostItemFacts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <Card className="lost-facts">
      {rows
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
    </Card>
  )
}
