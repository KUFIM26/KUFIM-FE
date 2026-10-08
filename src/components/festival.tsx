import { Link } from 'react-router-dom'
import { Asset, Card, EmptyState, Tabs } from './ui'
import { figmaAssets as assets } from '../data/figma-assets'
import { facilities } from '../data/mock'
import type { Booth, Performance, Notice } from '../data/mock'
import { useDemo } from '../app/demo-context'
import { kst } from '../api/mappers'

export function EmergencyBanner({
  dismiss,
  notice,
  admin = false,
}: {
  dismiss?: () => void
  notice?: Notice
  admin?: boolean
}) {
  const to = admin
    ? `/admin/notices/${notice?.id || 'urgent'}/edit`
    : `/notices/${notice?.id || 'urgent'}`
  return (
    <div className="red-gradient flex min-h-[61px] items-center gap-3 rounded-xl p-3 text-white shadow-card">
      <Asset src={assets['17:303'].imgVector2} />
      <Link to={to} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <strong className="text-base">긴급 공지</strong>
          <span className="text-xs font-medium">{notice?.date || '09.30. 18:32'}</span>
        </div>
        <p className="mt-1 text-xs font-bold">
          {notice?.title || '우천으로 인한 야간 부스 운영 시간 조정 안내'}
        </p>
      </Link>
      {dismiss ? (
        <button type="button" aria-label="긴급 공지 닫기" onClick={dismiss}>
          <Asset src={assets['17:303'].imgFrame1597881180} />
        </button>
      ) : (
        <Link to={to} aria-label="긴급 공지 보기">
          <Asset src={assets['42:751'].imgFrame1597881180} />
        </Link>
      )}
    </div>
  )
}
export function FestivalMeta() {
  const { festival, dayOptions } = useDemo()
  const today = festival ? kst(festival.serverTime).date : undefined
  const day = dayOptions.find((d) => d.date === today)
  return (
    <div className="flex items-center gap-1.5 text-[8px] font-bold text-white">
      {(!festival || day) && (
        <span className="rounded-xl bg-white/50 px-1.5 py-px">{day?.label ?? 'DAY 1'}</span>
      )}
      <span>{today ? `${today.replaceAll('-', '.')}.` : '2026.09.30.'}</span>
      <span>{festival ? festival.location : '건국대학교 서울캠퍼스'}</span>
    </div>
  )
}

export function Stats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="flex h-[59px] gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[13px] bg-white/20 px-1 py-2 font-bold"
        >
          <span className="text-[8.581px] text-[#d1d1d1]">{item.label}</span>
          <strong className="text-[17.778px] text-white">{item.value}</strong>
        </div>
      ))}
    </div>
  )
}
export function ScheduleList({ items, admin = false }: { items: Performance[]; admin?: boolean }) {
  if (!items.length) return <EmptyState>이 날짜에 등록된 공연이 없어요.</EmptyState>
  return (
    <Card className="overflow-hidden">
      {items.map((item) => (
        <Link
          to={admin ? `/admin/performances/${item.id}/edit` : `/performances/${item.id}`}
          key={item.id}
          className={`flex min-h-[55px] items-center gap-3 border-b-[0.5px] border-[#d9d9d9]/70 px-4 py-2 last:border-0 ${item.status === 'now' ? 'bg-[#57aa5a]/15' : item.status === 'next' ? 'bg-[#ff8b3d]/15' : ''} ${item.status === 'past' ? 'text-[#d9d9d9]' : ''}`}
        >
          <span
            className={`h-[39px] w-[3px] shrink-0 ${item.status === 'now' ? 'bg-[#57aa5a]' : item.status === 'next' ? 'bg-[#ff9955]' : 'bg-[#d9d9d9]'}`}
          />
          <span className="w-[34px] shrink-0 text-center text-xs font-semibold">{item.time}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold">{item.name}</h3>
            <p className="mt-1.5 text-xs font-medium">{item.place}</p>
          </div>
          {(item.status === 'now' || item.status === 'next') && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${item.status === 'now' ? 'bg-[#57aa5a]' : 'bg-[#ff8b3d]'}`}
            >
              {item.status.toUpperCase()}
            </span>
          )}
        </Link>
      ))}
    </Card>
  )
}
export function PerformanceFilters({
  day,
  stage,
  onDay,
  onStage,
}: {
  day: string
  stage: string
  onDay: (value: string) => void
  onStage: (value: string) => void
}) {
  const { dayOptions, stageOptions } = useDemo()
  return (
    <div className="flex flex-col gap-3 px-5 pt-3">
      <Tabs value={day} onChange={onDay} options={dayOptions} />
      <Tabs underline value={stage} onChange={onStage} options={stageOptions} />
    </div>
  )
}
export function WaitingNumbers({ booth }: { booth: Booth }) {
  if (booth.teams === undefined) return null
  return (
    <div className="flex w-[90px] shrink-0 flex-col items-center gap-1">
      <span className="text-xs font-medium">대기현황</span>
      <div className="flex gap-0.5 text-sm font-semibold text-[#8a0000]">
        <span className="min-w-11 rounded-full bg-[#ffcccc] px-1 text-center">{booth.teams}팀</span>
        <span className="min-w-11 rounded-full bg-[#ffcccc] px-1 text-center">
          {booth.minutes}분
        </span>
      </div>
    </div>
  )
}
export function BoothRow({
  booth,
  description = false,
  onClick,
  admin = false,
}: {
  booth: Booth
  description?: boolean
  onClick?: () => void
  admin?: boolean
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold">{booth.name}</h3>
        <p className="mt-1.5 text-xs font-medium">
          {booth.place}
          <span className="mx-1.5">|</span>
          {booth.hours}
        </p>
        {description && <p className="mt-1.5 text-xs">{booth.description}</p>}
      </div>
      <WaitingNumbers booth={booth} />
    </>
  )
  const classes = 'flex w-full items-center justify-between gap-2 py-4 text-left'
  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  ) : (
    <Link className={classes} to={admin ? `/admin/booths/${booth.id}/edit` : `/booths/${booth.id}`}>
      {content}
    </Link>
  )
}
export function FacilityFilters({
  value,
  onChange,
  subdued = false,
}: {
  value: string
  onChange: (value: string) => void
  subdued?: boolean
}) {
  const a = subdued ? assets['118:1642'] : assets['53:1227']
  const icons = [
    a.imgFrame1597881221,
    a.imgFrame1597881222,
    a.imgFrame1597881223,
    a.imgGroup3,
    a.imgFrame1597881224,
  ]
  return (
    <div
      className="flex items-center justify-between gap-1 px-5 py-3"
      role="group"
      aria-label="시설 유형"
    >
      {facilities.map((facility, i) => (
        <button
          key={facility}
          type="button"
          aria-pressed={value === facility}
          onClick={() => onChange(value === facility ? '' : facility)}
          className={`flex min-w-0 flex-col items-center gap-1 rounded-md text-sm font-medium text-[#383838] ${value === facility ? 'ring-2 ring-brand ring-offset-2' : ''}`}
        >
          <span
            className={`flex size-[30px] items-center justify-center rounded-full ${i === 3 ? (subdued ? 'bg-[#cdcdcd]' : 'bg-[#e3d0ff]') : ''}`}
          >
            <Asset src={icons[i]} />
          </span>
          <span className="whitespace-nowrap max-[360px]:text-xs">{facility}</span>
        </button>
      ))}
    </div>
  )
}
export function MapImage({
  className = '',
  variant = 'map',
}: {
  className?: string
  variant?: 'map' | 'mini' | 'picker'
}) {
  return (
    <div
      className={`map-crop ${variant === 'mini' ? 'map-mini' : variant === 'picker' ? 'map-picker' : ''} ${className}`}
    >
      <img
        src={assets['53:1227'].imgBasemapImage}
        alt="건국대학교 서울캠퍼스와 일감호 일대 축제 지도"
        draggable={false}
      />
    </div>
  )
}
