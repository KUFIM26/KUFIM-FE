import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDemo } from '../app/demo-context'
import { BottomActions, Page, StatusMessage } from '../components/layout'
import { Asset, Button, Chips, ConfirmDialog, SectionTitle, Tabs } from '../components/ui'
import { FacilityFilters, FloorplanMap, MapImage, PerformanceFilters } from '../components/festival'
import { boothCategories } from '../data/mock'
import type { Booth, Notice, Performance } from '../data/mock'
import { figmaAssets as assets } from '../data/figma-assets'
import { NotFoundPage } from './UtilityPages'
import { pickOption } from '../components/options'
import { isApiMode } from '../api/config'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import { useAsync } from '../api/useAsync'
import {
  facilityLabels,
  fromLabel,
  noticeLabels,
  organizerLabels,
  performanceLabels,
  toOffsetTime,
  toPerformance,
} from '../api/mappers'
import type { PinInput } from '../api/types'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="form-field">
      <SectionTitle>{label}</SectionTitle>
      {children}
    </label>
  )
}
function SaveBar({
  form,
  cancel,
  saving = false,
}: {
  form: string
  cancel: () => void
  saving?: boolean
}) {
  return (
    <BottomActions>
      <Button
        type="submit"
        form={form}
        disabled={saving}
        className="!bg-[#1d8a45] !bg-none !text-base"
      >
        {saving ? '저장 중…' : '저장하기'}
      </Button>
      <Button tone="gray" className="!bg-[#cfcfcf] !text-base" onClick={cancel}>
        취소하기
      </Button>
    </BottomActions>
  )
}
const value = (data: FormData, key: string) => String(data.get(key) || '').trim()

// Runs an admin write, refreshes the catalog and leaves the form. Errors stay on the form.
function useAdminWrite() {
  const { refresh } = useDemo()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const run = async (action: () => Promise<unknown>, to: string) => {
    setSaving(true)
    setError('')
    try {
      await action()
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.code === 'M003'
          ? '지도 도면이 등록되지 않아 위치를 저장할 수 없어요. 위치 없이 저장하거나 도면을 먼저 등록해주세요.'
          : (reason as Error).message,
      )
      setSaving(false)
      return
    }
    try {
      await refresh()
    } catch {
      // The write succeeded; the list will catch up on the next load.
    }
    navigate(to)
  }
  return { saving, error, setError, run }
}
function FormError({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  )
}
// Delete link for edit forms backed by the API.
function DeleteAction({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-center text-sm font-bold text-danger underline"
      >
        {label} 삭제하기
      </button>
      <ConfirmDialog
        open={open}
        title={`${label} 삭제`}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false)
          onConfirm()
        }}
        confirmLabel="삭제하기"
        cancelLabel="닫기"
        admin
      >
        삭제한 {label}은(는) 되돌릴 수 없어요.
      </ConfirmDialog>
    </>
  )
}
const requireFestival = (festivalId: number | undefined) => {
  if (!festivalId) throw new Error('등록된 축제가 없어요. 축제를 먼저 등록해주세요.')
  return festivalId
}
const toPin = (point: { x: number; y: number }): PinInput => ({
  xPercent: Math.round(point.x * 100) / 100,
  yPercent: Math.round(point.y * 100) / 100,
})

function TimeSelect({ name, initial }: { name: string; initial?: string }) {
  const times = Array.from(
    { length: 96 },
    (_, i) =>
      `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
  )
  return (
    <span className="relative block">
      <select
        className="form-control appearance-none pr-9"
        name={name}
        required
        defaultValue={initial || ''}
      >
        <option value="" disabled>
          00:00
        </option>
        {times.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
        <Asset src={assets['108:481'].imgVector2} />
      </span>
    </span>
  )
}

export function NoticeFormPage() {
  const { id } = useParams()
  const { notices, setNotices } = useDemo()
  const item = notices.find((n) => n.id === id)
  const [category, setCategory] = useState(item?.category || '긴급')
  const navigate = useNavigate()
  const write = useAdminWrite()
  if (id && !item) return <NotFoundPage />
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (isApiMode) {
      const input = {
        title: value(data, 'title'),
        content: value(data, 'body'),
        category: fromLabel(noticeLabels, category),
      }
      void write.run(
        () => (item ? api.admin.notices.update(item.id, input) : api.admin.notices.create(input)),
        '/admin/notices',
      )
      return
    }
    const next: Notice = {
      id: item?.id || `notice-${Date.now()}`,
      title: value(data, 'title'),
      body: value(data, 'body'),
      category,
      date: item?.date || '09.30. 18:32',
      unread: true,
    }
    setNotices((items) =>
      item ? items.map((n) => (n.id === item.id ? next : n)) : [next, ...items],
    )
    navigate('/admin/notices')
  }
  return (
    <Page title={item ? '공지사항 수정' : '공지사항 등록'} back="/admin/notices" className="pb-28">
      <form id="notice-form" onSubmit={submit} className="page-pad">
        <section className="form-field">
          <SectionTitle>공지 유형</SectionTitle>
          <Chips
            options={['긴급', '공연', '안전', '교통', '안내']}
            value={category}
            onChange={setCategory}
          />
        </section>
        <Field label="공지 제목">
          <input
            className="form-control"
            name="title"
            required
            maxLength={25}
            defaultValue={item?.title}
            placeholder="공지 제목을 입력하세요.(25자 이내)"
          />
        </Field>
        <Field label="공지 내용">
          <textarea
            className="form-control min-h-[189px] resize-y"
            name="body"
            required
            defaultValue={item?.body}
            placeholder="공지 내용을 입력하세요."
          />
        </Field>
        <FormError message={write.error} />
        {isApiMode && item && (
          <DeleteAction
            label="공지"
            onConfirm={() => write.run(() => api.admin.notices.remove(item.id), '/admin/notices')}
          />
        )}
      </form>
      <SaveBar form="notice-form" saving={write.saving} cancel={() => navigate('/admin/notices')} />
    </Page>
  )
}
export function PerformanceFormPage() {
  const { id } = useParams()
  const { performances, dayOptions } = useDemo()
  // The list response has no description, cast or setlist, so editing loads the detail.
  const detail = useAsync(isApiMode && id ? () => api.performance(id) : null, [id])
  if (isApiMode && id) {
    if (detail.loading) return <StatusMessage>공연 정보를 불러오는 중이에요.</StatusMessage>
    if (detail.error && !(detail.error instanceof ApiError && detail.error.status === 404))
      return <StatusMessage onRetry={detail.reload}>{detail.error.message}</StatusMessage>
  }
  const item =
    isApiMode && id
      ? detail.data && toPerformance(detail.data, dayOptions)
      : performances.find((p) => p.id === id)
  if (id && !item) return <NotFoundPage />
  return <PerformanceForm key={id ?? 'new'} item={item} />
}
function PerformanceForm({ item }: { item?: Performance }) {
  const { setPerformances, festival, dayOptions, stageOptions } = useDemo()
  const [params] = useSearchParams()
  const [day, setDay] = useState(item?.day || pickOption(dayOptions, params.get('day')))
  const [stage, setStage] = useState(item?.stage || pickOption(stageOptions, params.get('stage')))
  const [kind, setKind] = useState(item?.kind || '밴드')
  const [timeError, setTimeError] = useState('')
  const navigate = useNavigate()
  const write = useAdminWrite()
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (value(data, 'end') <= value(data, 'time')) {
      setTimeError('종료 시간을 시작 시간 이후로 선택해주세요.')
      return
    }
    setTimeError('')
    if (isApiMode) {
      const date = dayOptions.find((d) => d.value === day)?.date
      void write.run(async () => {
        if (!date) throw new Error('공연 날짜를 선택해주세요.')
        const input = {
          festivalId: requireFestival(festival?.festivalId),
          stageId: Number(stage),
          title: value(data, 'name'),
          type: fromLabel(performanceLabels, kind),
          description: value(data, 'description'),
          additionalDescription: value(data, 'additionalDescription'),
          castMembers: value(data, 'cast'),
          setlist: value(data, 'setlist'),
          startAt: toOffsetTime(date, value(data, 'time')),
          endAt: toOffsetTime(date, value(data, 'end')),
        }
        return item
          ? api.admin.performances.update(item.id, input)
          : api.admin.performances.create(input)
      }, `/admin/performances?day=${day}&stage=${stage}`)
      return
    }
    const next: Performance = {
      id: item?.id || `performance-${Date.now()}`,
      name: value(data, 'name'),
      description: value(data, 'description'),
      additionalDescription: value(data, 'additionalDescription'),
      cast: value(data, 'cast'),
      setlist: value(data, 'setlist'),
      day,
      stage,
      kind,
      time: value(data, 'time'),
      end: value(data, 'end'),
      place: stage === 'main' ? '노천극장' : '황소상 서브무대',
    }
    setPerformances((items) =>
      item ? items.map((p) => (p.id === item.id ? next : p)) : [...items, next],
    )
    navigate(`/admin/performances?day=${day}&stage=${stage}`)
  }
  return (
    <Page
      title={item ? '무대 프로그램 수정' : '무대 프로그램 등록'}
      back="/admin/performances"
      className="pb-28"
    >
      <PerformanceFilters day={day} stage={stage} onDay={setDay} onStage={setStage} />
      <form id="performance-form" onSubmit={submit} className="page-pad !gap-6">
        <section className="form-field">
          <SectionTitle>무대 유형</SectionTitle>
          <Chips options={['밴드', '댄스', '아티스트', '기타']} value={kind} onChange={setKind} />
        </section>
        <Field label="무대 팀명">
          <input
            className="form-control"
            name="name"
            required
            maxLength={15}
            defaultValue={item?.name}
            placeholder="무대 팀명을 입력하세요.(15자 이내)"
          />
        </Field>
        <section className="form-field">
          <SectionTitle>공연 시간</SectionTitle>
          <div className="flex items-center gap-4">
            <label className="min-w-0 flex-1">
              <span className="sr-only">공연 시작 시간</span>
              <TimeSelect name="time" initial={item?.time} />
            </label>
            <span>~</span>
            <label className="min-w-0 flex-1">
              <span className="sr-only">공연 종료 시간</span>
              <TimeSelect name="end" initial={item?.end} />
            </label>
          </div>
          {timeError && (
            <p role="alert" className="text-xs text-danger">
              {timeError}
            </p>
          )}
        </section>
        <Field label="공연 소개">
          <textarea
            className="form-control min-h-[132px] resize-y"
            name="description"
            required
            defaultValue={item?.description}
            placeholder="공연 소개를 입력하세요."
          />
        </Field>
        <Field label="공연 소개">
          <textarea
            aria-label="공연 소개 추가 내용"
            className="form-control min-h-[132px] resize-y"
            name="additionalDescription"
            defaultValue={item?.additionalDescription}
            placeholder="공연 소개를 입력하세요."
          />
        </Field>
        <Field label="출연진">
          <textarea
            className="form-control min-h-[100px] resize-y"
            name="cast"
            defaultValue={item?.cast}
            placeholder="출연진을 입력하세요."
          />
        </Field>
        <Field label="셋리스트">
          <textarea
            className="form-control min-h-[200px] resize-y"
            name="setlist"
            defaultValue={item?.setlist}
            placeholder="셋리스트를 입력하세요."
          />
        </Field>
        <FormError message={write.error} />
        {isApiMode && item && (
          <DeleteAction
            label="무대 프로그램"
            onConfirm={() =>
              write.run(
                () => api.admin.performances.remove(item.id),
                `/admin/performances?day=${day}&stage=${stage}`,
              )
            }
          />
        )}
      </form>
      <SaveBar
        form="performance-form"
        saving={write.saving}
        cancel={() => navigate('/admin/performances')}
      />
    </Page>
  )
}

// A tall floorplan scrolls inside the dialog; the design image keeps its fixed crop.
function PickerFrame({ scroll, children }: { scroll: boolean; children: ReactNode }) {
  if (!scroll) return <>{children}</>
  return (
    <div className="absolute inset-x-5 top-5 bottom-[110px] overflow-auto rounded-xl bg-[#eef1ee]">
      {children}
    </div>
  )
}
function LocationPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (point: { x: number; y: number }) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { floorplan } = useDemo()
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    else if (!open) dialog.current?.close()
  }, [open])
  return (
    <dialog ref={dialog} aria-label="부스 위치 지정" className="location-dialog" onCancel={onClose}>
      <p className="sr-only">지도에서 위치를 클릭하거나 방향키로 이동한 후 지정하기를 누르세요.</p>
      <PickerFrame scroll={!!floorplan}>
        <button
          type="button"
          aria-label="지도에서 위치 선택"
          className={
            floorplan
              ? 'relative block w-full'
              : 'absolute inset-x-5 top-[calc(50%-270px)] block overflow-hidden rounded-xl'
          }
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect()
            setPoint({
              x: ((event.clientX - box.left) / box.width) * 100,
              y: ((event.clientY - box.top) / box.height) * 100,
            })
          }}
          onKeyDown={(event) => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
              event.preventDefault()
              setPoint((p) => ({
                x: Math.max(
                  2,
                  Math.min(
                    98,
                    (p?.x ?? 50) +
                      (event.key === 'ArrowLeft' ? -2 : event.key === 'ArrowRight' ? 2 : 0),
                  ),
                ),
                y: Math.max(
                  2,
                  Math.min(
                    98,
                    (p?.y ?? 50) +
                      (event.key === 'ArrowUp' ? -2 : event.key === 'ArrowDown' ? 2 : 0),
                  ),
                ),
              }))
            }
          }}
        >
          {floorplan ? (
            // Same image and percent coordinates as the public map, so the pin lands where it was put.
            <FloorplanMap floorplan={floorplan} />
          ) : (
            <MapImage variant="picker" className="h-[499px] max-h-[65dvh]" />
          )}
          {point && (
            <span
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <Asset src={assets['53:1227'].imgGroup2} />
            </span>
          )}
        </button>
      </PickerFrame>
      <div className="absolute inset-x-0 bottom-0 flex gap-2 rounded-t-xl bg-white p-5">
        <Button
          className="!bg-[#1d8a45] !bg-none !text-base"
          onClick={() => onSelect(point ?? { x: 50, y: 50 })}
        >
          지정하기
        </Button>
        <Button tone="gray" className="!text-base" onClick={onClose}>
          취소하기
        </Button>
      </div>
    </dialog>
  )
}
export function BoothFormPage() {
  const { id } = useParams()
  const { booths } = useDemo()
  const listed = booths.find((b) => b.id === id)
  // Booth descriptions only come with the detail response; facilities already carry theirs.
  const needsDetail = isApiMode && !!listed && listed.period !== 'facility'
  const detail = useAsync(needsDetail ? () => api.booth(listed!.id) : null, [listed?.id])
  if (id && !listed) return <NotFoundPage />
  if (needsDetail && detail.loading)
    return <StatusMessage>부스 정보를 불러오는 중이에요.</StatusMessage>
  if (needsDetail && detail.error)
    return <StatusMessage onRetry={detail.reload}>{detail.error.message}</StatusMessage>
  const item = listed && {
    ...listed,
    description: detail.data?.description ?? listed.description,
  }
  return <BoothForm key={id ?? 'new'} item={item} />
}
function BoothForm({ item }: { item?: Booth }) {
  const { setBooths, festival } = useDemo()
  const [params, setParams] = useSearchParams()
  const initial = item?.period || params.get('period') || 'day'
  const [period, setPeriod] = useState<Booth['period']>(
    initial === 'night' || initial === 'facility' ? initial : 'day',
  )
  const [category, setCategory] = useState(
    item?.category || (initial === 'facility' ? '상황실' : '총학생회'),
  )
  const [position, setPosition] = useState<{ x: number; y: number } | null>(item?.position ?? null)
  const [waitingEnabled, setWaitingEnabled] = useState(item?.waitingEnabled ?? true)
  const facility = period === 'facility'
  const pickerOpen = params.get('location') === 'pick'
  const navigate = useNavigate()
  const write = useAdminWrite()
  // Booths and facilities are separate backend resources, so an edit keeps its kind.
  const periodOptions = [
    { value: 'day', label: '주간', sublabel: '09:00~17:00' },
    { value: 'night', label: '야간', sublabel: '18:00~25:00' },
    { value: 'facility', label: '시설' },
  ].filter((o) => !isApiMode || !item || (item.period === 'facility') === (o.value === 'facility'))
  const defaultHours = facility ? '24시간' : period === 'day' ? '09:00~17:00' : '18:00~25:00'
  const closePicker = () =>
    setParams(
      (previous) => {
        previous.delete('location')
        return previous
      },
      { replace: true },
    )
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (isApiMode) {
      const moved =
        position && (position.x !== item?.position?.x || position.y !== item?.position?.y)
      const common = {
        name: value(data, 'name'),
        description: value(data, 'description'),
        place: value(data, 'place'),
        operatingHours: item?.hours || defaultHours,
        ...(moved ? { pin: toPin(position) } : {}),
      }
      void write.run(async () => {
        const festivalId = requireFestival(festival?.festivalId)
        if (facility) {
          const input = { ...common, festivalId, type: fromLabel(facilityLabels, category) }
          const facilityId = item?.id.replace('facility-', '')
          return facilityId
            ? api.admin.facilities.update(facilityId, input)
            : api.admin.facilities.create(input)
        }
        const input = {
          ...common,
          festivalId,
          organizerType: fromLabel(organizerLabels, category),
          period: period === 'night' ? ('NIGHT' as const) : ('DAY' as const),
          waitingEnabled,
        }
        return item ? api.admin.booths.update(item.id, input) : api.admin.booths.create(input)
      }, `/admin/booths?period=${period}`)
      return
    }
    const next: Booth = {
      id: item?.id || `booth-${Date.now()}`,
      name: value(data, 'name'),
      description: value(data, 'description'),
      place: value(data, 'place'),
      period,
      category,
      hours: facility ? '24시간' : period === 'day' ? '09:00~17:00' : '18:00~25:00',
      ...(position ? { position } : {}),
      ...(facility ? {} : { teams: item?.teams ?? 0, minutes: item?.minutes ?? 0 }),
    }
    setBooths((items) =>
      item ? items.map((b) => (b.id === item.id ? next : b)) : [...items, next],
    )
    navigate(`/admin/booths?period=${period}`)
  }
  return (
    <Page
      title={item ? '부스 프로그램 수정' : '부스 프로그램 등록'}
      back="/admin/booths"
      className={`pb-28 ${pickerOpen ? 'picker-open' : ''}`}
    >
      <div className="border-b border-[#d9d9d9] px-5 pt-3 pb-3">
        <Tabs
          value={period}
          onChange={(v) => {
            setPeriod(v as Booth['period'])
            setCategory(v === 'facility' ? '상황실' : '총학생회')
          }}
          options={periodOptions}
        />
      </div>
      {facility && (
        <FacilityFilters subdued value={category} onChange={(v) => setCategory(v || '상황실')} />
      )}
      <form id="booth-form" className="page-pad !gap-6 !pt-3" onSubmit={submit}>
        {!facility && (
          <section className="form-field">
            <SectionTitle>부스 유형</SectionTitle>
            <Chips options={boothCategories.slice(1)} value={category} onChange={setCategory} />
          </section>
        )}
        <Field label={facility ? '시설 명' : '부스 명'}>
          <input
            className="form-control"
            name="name"
            required
            maxLength={15}
            defaultValue={item?.name}
            placeholder="부스 이름을 입력하세요.(15자 이내)"
          />
        </Field>
        <Field label={facility ? '시설 장소' : '운영 장소'}>
          <input
            className="form-control"
            name="place"
            required
            defaultValue={item?.place}
            placeholder="운영 장소를 입력하세요."
          />
        </Field>
        <Field label={facility ? '시설 소개' : '부스 소개'}>
          <textarea
            className="form-control min-h-[132px] resize-y"
            name="description"
            defaultValue={item?.description}
            placeholder="공연 소개를 입력하세요."
          />
        </Field>
        <section className="form-field">
          <SectionTitle>{facility ? '시설' : '부스'} 위치 지정(지도를 클릭하여 수정)</SectionTitle>
          <button
            type="button"
            className="relative overflow-hidden rounded-xl"
            aria-label="지도에서 위치 지정"
            onClick={() =>
              setParams(
                (previous) => {
                  previous.set('location', 'pick')
                  return previous
                },
                { replace: true },
              )
            }
          >
            <MapImage variant="mini" className="h-[200px]" />
            {position && (
              <span className="absolute right-2 bottom-2 rounded-full bg-brand px-3 py-1 text-xs text-white">
                위치 지정 완료
              </span>
            )}
          </button>
        </section>
        {isApiMode && !facility && (
          <label className="flex items-center gap-2 text-base font-bold">
            <input
              type="checkbox"
              checked={waitingEnabled}
              onChange={(e) => setWaitingEnabled(e.target.checked)}
              className="size-5 accent-[#1d8a45]"
            />
            QR 웨이팅 사용
          </label>
        )}
        <FormError message={write.error} />
        {isApiMode && item && (
          <DeleteAction
            label={facility ? '시설' : '부스'}
            onConfirm={() =>
              write.run(
                () =>
                  facility
                    ? api.admin.facilities.remove(item.id.replace('facility-', ''))
                    : api.admin.booths.remove(item.id),
                `/admin/booths?period=${period}`,
              )
            }
          />
        )}
      </form>
      <SaveBar form="booth-form" saving={write.saving} cancel={() => navigate('/admin/booths')} />
      <LocationPicker
        open={params.get('location') === 'pick'}
        onClose={closePicker}
        onSelect={(p) => {
          setPosition(p)
          closePicker()
        }}
      />
    </Page>
  )
}
