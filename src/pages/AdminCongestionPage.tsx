import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFestival } from '../app/festival-context'
import { Page, BottomActions } from '../components/layout'
import { Button, Card, EmptyState } from '../components/ui'
import { RequestState } from '../components/RequestState'
import { useAction, useResource } from '../hooks/useResource'
import { congestionApi } from '../hooks/useCongestionApi'
import type { CongestionLevel, CongestionZone } from '../hooks/useCongestionApi'
import { useTopic } from '../apis/realtime'

const levels: { value: CongestionLevel; label: string; color: string }[] = [
  { value: 'SMOOTH', label: '원활', color: '#9ec7e9' },
  { value: 'NORMAL', label: '보통', color: '#c8e99e' },
  { value: 'CROWDED', label: '혼잡', color: '#ffd8a5' },
  { value: 'VERY_CROWDED', label: '매우 혼잡', color: '#ff8787' },
]
type Draft = { level: CongestionLevel | null; people: string }
const draftOf = (zone: CongestionZone): Draft => ({
  level: zone.level,
  people: zone.estimatedPeople?.toString() ?? '',
})
function updatedLabel(value: string | null) {
  if (!value) return '아직 저장된 혼잡도가 없습니다.'
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const get = (type: string) => parts.find((part) => part.type === type)?.value
  return `${get('year')}.${get('month')}.${get('day')}. ${get('hour')}:${get('minute')} 기준`
}

export default function AdminCongestionPage() {
  const { stages } = useFestival()
  const ordered = useMemo(
    () => [...stages].sort((a, b) => a.displayOrder - b.displayOrder),
    [stages],
  )
  const [selected, setSelected] = useState<number | null>(null)
  const stageId = selected ?? ordered[0]?.stageId
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [message, setMessage] = useState('')
  const action = useAction()
  const navigate = useNavigate()
  const loader = useCallback(
    () => (stageId ? congestionApi.zones(stageId) : Promise.resolve([])),
    [stageId],
  )
  const resource = useResource(loader, 15000)
  useTopic('/topic/congestion', resource.refresh)
  const zones = (resource.data ?? [])
    .filter((zone) => zone.active)
    .sort((a, b) => a.displayOrder - b.displayOrder)
  const changed = zones.filter((zone) => drafts[zone.zoneId])
  const update = (zone: CongestionZone, patch: Partial<Draft>) => {
    setMessage('')
    setDrafts((current) => ({
      ...current,
      [zone.zoneId]: { ...(current[zone.zoneId] ?? draftOf(zone)), ...patch },
    }))
  }
  const save = () =>
    void action.run(async () => {
      for (const zone of changed) {
        const draft = drafts[zone.zoneId]
        if (!draft.level) throw new Error(`${zone.name}: 혼잡도를 선택해 주세요.`)
        if (draft.people !== '' && (!/^\d+$/.test(draft.people) || Number(draft.people) > 9999))
          throw new Error('추정 인원은 0~9999 사이의 정수로 입력해 주세요.')
      }
      for (const zone of changed) {
        const draft = drafts[zone.zoneId]
        await congestionApi.save(zone.zoneId, {
          level: draft.level!,
          estimatedPeople: draft.people === '' ? null : Number(draft.people),
        })
        // Remove only successfully saved drafts so partial failures remain retryable.
        setDrafts((current) => {
          const next = { ...current }
          delete next[zone.zoneId]
          return next
        })
        await resource.refresh()
      }
      setMessage('혼잡도를 저장했습니다.')
    })
  return (
    <Page
      title="혼잡도 관리"
      back="/admin"
      backIcon="/assets/figma/congestion/back.svg"
      className="congestion-page pb-[108px]"
    >
      <div
        className="flex gap-[30px] border-b border-[#d9d9d9] px-[31px]"
        role="group"
        aria-label="무대 선택"
      >
        {ordered.map((stage) => (
          <button
            key={stage.stageId}
            type="button"
            disabled={action.pending}
            aria-pressed={stageId === stage.stageId}
            onClick={() => {
              setSelected(stage.stageId)
              setMessage('')
            }}
            className={`min-h-[37px] min-w-0 flex-1 border-b-2 text-[15px] font-bold ${stageId === stage.stageId ? 'border-brand text-brand' : 'border-[#d9d9d9] text-[#464646]'}`}
          >
            {stage.name}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-5 px-5 pt-5">
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
        {!resource.loading && !resource.error && !zones.length && (
          <EmptyState>
            {stages.length ? '등록된 혼잡도 구역이 없습니다.' : '등록된 무대가 없습니다.'}
          </EmptyState>
        )}
        {zones.map((zone) => {
          const draft = drafts[zone.zoneId] ?? draftOf(zone)
          const step = (amount: number) =>
            update(zone, {
              people: String(Math.max(0, Math.min(9999, (Number(draft.people) || 0) + amount))),
            })
          return (
            <Card key={zone.zoneId} className="p-[15px]">
              <h2 className="text-base font-bold">{zone.name}</h2>
              <p className="mt-0.5 text-xs font-semibold">{updatedLabel(zone.updatedAt)}</p>
              <fieldset disabled={action.pending} className="mt-3 flex gap-2">
                <legend className="sr-only">{zone.name} 추정 인원</legend>
                <button
                  type="button"
                  aria-label={`${zone.name} 50명 감소`}
                  onClick={() => step(-50)}
                  className="h-10 w-[60px] shrink-0 rounded-[11px] bg-[#efefef] text-base font-bold shadow-[1px_1px_.5px_#0000001a]"
                >
                  -50
                </button>
                <input
                  aria-label={`${zone.name} 추정 인원`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="9999"
                  step="1"
                  placeholder="미입력"
                  value={draft.people}
                  onChange={(e) => update(zone, { people: e.target.value })}
                  className="h-10 w-full rounded-[11px] bg-[#efefef] text-center text-base font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label={`${zone.name} 50명 증가`}
                  onClick={() => step(50)}
                  className="h-10 w-[60px] shrink-0 rounded-[11px] bg-[#efefef] text-base font-bold shadow-[1px_1px_.5px_#0000001a]"
                >
                  +50
                </button>
              </fieldset>
              <fieldset disabled={action.pending} className="mt-[14px] grid grid-cols-2 gap-[11px]">
                <legend className="sr-only">{zone.name} 혼잡도</legend>
                {levels.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    aria-pressed={draft.level === level.value}
                    onClick={() => update(zone, { level: level.value })}
                    style={{
                      backgroundColor:
                        draft.level && draft.level !== level.value ? '#CFCFCF' : level.color,
                    }}
                    className={`h-[60px] rounded-xl text-xl font-bold text-[#161616] shadow-[1px_1px_.5px_#0000001a] ${draft.level === level.value ? 'ring-2 ring-brand ring-offset-2' : ''}`}
                  >
                    {level.label}
                  </button>
                ))}
              </fieldset>
            </Card>
          )
        })}
        <RequestState error={action.error} />
        <p role="status" className="text-sm text-brand">
          {message}
        </p>
      </div>
      <BottomActions>
        <Button
          disabled={action.pending || !changed.length || !!resource.error}
          onClick={save}
          className="!min-h-12 !rounded-[13px] !bg-[#1d8a45] !bg-none !py-2 !text-base !font-extrabold"
        >
          {action.pending ? '저장 중…' : '저장하기'}
        </Button>
        <Button
          tone="gray"
          disabled={action.pending}
          onClick={() => navigate('/admin')}
          className="!min-h-12 !rounded-[13px] !bg-[#cfcfcf] !py-2 !text-base !font-extrabold"
        >
          취소하기
        </Button>
      </BottomActions>
    </Page>
  )
}
