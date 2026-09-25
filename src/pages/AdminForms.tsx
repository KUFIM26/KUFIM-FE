import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDemo } from '../app/demo-context'
import { BottomActions, Page } from '../components/layout'
import { Asset, Button, Chips, SectionTitle, Tabs } from '../components/ui'
import { FacilityFilters, MapImage, PerformanceFilters } from '../components/festival'
import { boothCategories } from '../data/mock'
import type { Booth, Notice, Performance } from '../data/mock'
import { figmaAssets as assets } from '../data/figma-assets'
import { NotFoundPage } from './UtilityPages'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="form-field">
      <SectionTitle>{label}</SectionTitle>
      {children}
    </label>
  )
}
function SaveBar({ form, cancel }: { form: string; cancel: () => void }) {
  return (
    <BottomActions>
      <Button type="submit" form={form} className="!bg-[#1d8a45] !bg-none !text-base">
        저장하기
      </Button>
      <Button tone="gray" className="!bg-[#cfcfcf] !text-base" onClick={cancel}>
        취소하기
      </Button>
    </BottomActions>
  )
}
const value = (data: FormData, key: string) => String(data.get(key) || '').trim()

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
  if (id && !item) return <NotFoundPage />
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
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
      </form>
      <SaveBar form="notice-form" cancel={() => navigate('/admin/notices')} />
    </Page>
  )
}
export function PerformanceFormPage() {
  const { id } = useParams()
  const { performances, setPerformances } = useDemo()
  const item = performances.find((p) => p.id === id)
  const [params] = useSearchParams()
  const [day, setDay] = useState(item?.day || params.get('day') || '1')
  const [stage, setStage] = useState(item?.stage || params.get('stage') || 'main')
  const [kind, setKind] = useState(item?.kind || '밴드')
  const [timeError, setTimeError] = useState('')
  const navigate = useNavigate()
  if (id && !item) return <NotFoundPage />
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (value(data, 'end') <= value(data, 'time')) {
      setTimeError('종료 시간을 시작 시간 이후로 선택해주세요.')
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
      </form>
      <SaveBar form="performance-form" cancel={() => navigate('/admin/performances')} />
    </Page>
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
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    else if (!open) dialog.current?.close()
  }, [open])
  return (
    <dialog ref={dialog} aria-label="부스 위치 지정" className="location-dialog" onCancel={onClose}>
      <p className="sr-only">지도에서 위치를 클릭하거나 방향키로 이동한 후 지정하기를 누르세요.</p>
      <button
        type="button"
        aria-label="지도에서 위치 선택"
        className="absolute inset-x-5 top-[calc(50%-270px)] block overflow-hidden rounded-xl"
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
                  (p?.y ?? 50) + (event.key === 'ArrowUp' ? -2 : event.key === 'ArrowDown' ? 2 : 0),
                ),
              ),
            }))
          }
        }}
      >
        <MapImage variant="picker" className="h-[499px] max-h-[65dvh]" />
        {point && (
          <span
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <Asset src={assets['53:1227'].imgGroup2} />
          </span>
        )}
      </button>
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
  const { booths, setBooths } = useDemo()
  const item = booths.find((b) => b.id === id)
  const [params, setParams] = useSearchParams()
  const initial = item?.period || params.get('period') || 'day'
  const [period, setPeriod] = useState<Booth['period']>(
    initial === 'night' || initial === 'facility' ? initial : 'day',
  )
  const [category, setCategory] = useState(
    item?.category || (initial === 'facility' ? '상황실' : '총학생회'),
  )
  const [position, setPosition] = useState<{ x: number; y: number } | null>(item?.position ?? null)
  const facility = period === 'facility'
  const pickerOpen = params.get('location') === 'pick'
  const navigate = useNavigate()
  if (id && !item) return <NotFoundPage />
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
          options={[
            { value: 'day', label: '주간', sublabel: '09:00~17:00' },
            { value: 'night', label: '야간', sublabel: '18:00~25:00' },
            { value: 'facility', label: '시설' },
          ]}
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
      </form>
      <SaveBar form="booth-form" cancel={() => navigate('/admin/booths')} />
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
