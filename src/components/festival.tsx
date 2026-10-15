import { useFestival } from '../app/festival-context'
import { festivalDays, performanceDays, seoulDate } from '../apis/adapters'
import type { Booth as MapBooth } from '../data/models'
import { Link } from 'react-router-dom'
import { Asset, Card, EmptyState, Tabs } from './ui'
import { figmaAssets as assets } from '../data/figma-assets'
import { facilities } from '../data/models'
import type { Booth, Performance, Notice } from '../data/models'

export function EmergencyBanner({
  dismiss,
  notice,
  admin = false,
}: {
  dismiss?: () => void
  notice?: Notice
  admin?: boolean
}) {
  if (!notice) return null
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
  const { festival } = useFestival()
  if (!festival) return null
  const today = seoulDate(festival.serverTime)
  const days = festivalDays(festival)
  const day = days.indexOf(today)
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[8px] font-bold text-white">
      {day >= 0 && <span className="rounded-xl bg-white/50 px-1.5 py-px">DAY {day + 1}</span>}
      <span>{today.replaceAll('-', '.')}.</span>
      {festival.location && <span>{festival.location}</span>}
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
  const { festival, stages, performances } = useFestival()
  const days = performanceDays(festival, performances)
  return (
    <div className="flex flex-col gap-3 px-5 pt-3">
      <div className="overflow-x-auto">
        <Tabs
          value={day}
          onChange={onDay}
          options={days.map((date, index) => ({
            value: date,
            label: `DAY ${index + 1}`,
            sublabel: date.slice(5).replace('-', '/'),
          }))}
        />
      </div>
      <Tabs
        underline
        value={stage}
        onChange={onStage}
        options={stages.map((s) => ({ value: String(s.stageId), label: s.name }))}
      />
    </div>
  )
}
export function WaitingNumbers({ booth }: { booth: Booth }) {
  if (booth.teams === undefined || booth.minutes === undefined) return null
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
  markers = [],
}: {
  className?: string
  variant?: 'map' | 'mini' | 'picker'
  markers?: MapBooth[]
}) {
  const { floorplan } = useFestival()
  if (!floorplan)
    return (
      <div
        className={`flex items-center justify-center bg-[#e8eee9] p-5 text-sm text-muted ${className}`}
      >
        등록된 지도가 없습니다.
      </div>
    )
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      data-map-variant={variant}
      style={{ aspectRatio: `${floorplan.width}/${floorplan.height}`, height: 'auto' }}
    >
      <img src={floorplan.imageUrl} alt="축제 지도" draggable={false} className="h-full w-full" />
      {markers
        .filter((b) => b.position)
        .map((b) => (
          <Link
            key={b.id}
            to={`/booths/${b.id}`}
            aria-label={`${b.name} 위치`}
            className="absolute -translate-x-1/2 -translate-y-full rounded bg-brand px-2 py-1 text-[10px] font-bold text-white shadow"
            style={{ left: `${b.position!.x}%`, top: `${b.position!.y}%` }}
          >
            {b.name}
          </Link>
        ))}
    </div>
  )
}
