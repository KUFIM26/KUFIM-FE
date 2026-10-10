import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDemo } from '../app/demo-context'
import { useAdminSession } from '../app/admin-session'
import { InlineError, Page } from '../components/layout'
import { Card, ConfirmDialog, EmptyState, SectionTitle, Tabs } from '../components/ui'
import { CongestionBadge } from '../components/congestion'
import { CsvDownload } from '../components/CsvDownload'
import { pickOption } from '../components/options'
import { isApiMode } from '../api/config'
import { api } from '../api/endpoints'
import { useAsync } from '../api/useAsync'
import { pollEvery, useRealtimeConnected, useTopic } from '../api/realtime'
import { congestionLevels, congestionStyles, relativeTime, useServerNow } from '../api/congestion'
import type { ApiAdminZone, CongestionLevel } from '../api/types'

// Recommended input interval (STG-002, proposed 5 minutes); older zones are highlighted.
const RECOMMENDED_MS = 5 * 60 * 1000

export default function AdminCongestionPage() {
  const { account } = useAdminSession()
  const { stageOptions, clockOffset } = useDemo()
  const [params, setParams] = useSearchParams()
  const stageId = pickOption(stageOptions, params.get('stage'))
  const allowed = isApiMode && account?.role === 'SUPER_ADMIN' && !!stageId
  const live = useRealtimeConnected()
  const zones = useAsync(
    allowed ? () => api.admin.zones(Number(stageId)) : null,
    [stageId],
    pollEvery(live, 15000),
  )
  useTopic(allowed ? '/topic/congestion' : null, zones.reload)
  // Server-adjusted clock from the provider; refreshed with every stage list read.
  const now = useServerNow(clockOffset, 15000)
  const [error, setError] = useState('')
  const [newZone, setNewZone] = useState('')
  const [deleting, setDeleting] = useState<ApiAdminZone | null>(null)

  if (!isApiMode)
    return (
      <Page title="혼잡도 입력" back="/admin">
        <div className="page-pad">
          <EmptyState>혼잡도 입력은 백엔드에 연결된 화면에서만 사용할 수 있어요.</EmptyState>
        </div>
      </Page>
    )
  if (account?.role !== 'SUPER_ADMIN')
    return (
      <Page title="혼잡도 입력" back="/admin">
        <div className="page-pad">
          <EmptyState>혼잡도 입력은 총괄 관리자만 할 수 있어요.</EmptyState>
        </div>
      </Page>
    )

  const act = async (action: () => Promise<unknown>) => {
    setError('')
    try {
      await action()
    } catch (reason) {
      setError((reason as Error).message)
    }
    void zones.reload()
  }
  const addZone = (event: FormEvent) => {
    event.preventDefault()
    const name = newZone.trim()
    if (!name) return
    void act(async () => {
      await api.admin.createZone(Number(stageId), name, (zones.data?.zones.length ?? 0) + 1)
      setNewZone('')
    })
  }
  const list = zones.data?.zones ?? []
  const active = list.filter((z) => z.active)
  const inactive = list.filter((z) => !z.active)

  return (
    <Page title="혼잡도 입력" back="/admin">
      <div className="px-5 pt-3">
        {stageOptions.length ? (
          <Tabs
            underline
            value={stageId}
            onChange={(v) => setParams({ stage: v }, { replace: true })}
            options={stageOptions}
          />
        ) : (
          <EmptyState>등록된 무대가 없어요. 무대를 먼저 등록해주세요.</EmptyState>
        )}
      </div>
      <div className="page-pad">
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {error}
          </p>
        )}
        {zones.error && !zones.data && <InlineError error={zones.error} onRetry={zones.reload} />}
        {stageId && !zones.data && !zones.error && (
          <EmptyState>구역을 불러오는 중이에요.</EmptyState>
        )}
        {zones.data && !active.length && (
          <EmptyState>아직 구역이 없어요. 아래에서 구역을 추가해주세요.</EmptyState>
        )}
        {active.map((zone) => (
          <ZoneInputCard
            key={zone.zoneId}
            zone={zone}
            now={now}
            onRecord={(level, people) =>
              act(() => api.admin.recordCongestion(zone.zoneId, level, people))
            }
            onDeactivate={() => act(() => api.admin.updateZone(zone.zoneId, { active: false }))}
            onDelete={() => setDeleting(zone)}
          />
        ))}
        {zones.data && (
          <form onSubmit={addZone} className="flex gap-2">
            <input
              className="form-control flex-1"
              value={newZone}
              maxLength={100}
              onChange={(e) => setNewZone(e.target.value)}
              placeholder="구역 이름 (예: 스탠딩 A구역)"
              aria-label="새 구역 이름"
            />
            <button
              type="submit"
              disabled={!newZone.trim()}
              className="rounded-[13px] bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              구역 추가
            </button>
          </form>
        )}
        {inactive.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionTitle>숨긴 구역</SectionTitle>
            <Card className="overflow-hidden">
              {inactive.map((zone) => (
                <div
                  key={zone.zoneId}
                  className="flex items-center justify-between border-b border-[#eee] px-4 py-3 last:border-0"
                >
                  <span className="text-sm font-bold text-muted">{zone.name}</span>
                  <button
                    type="button"
                    onClick={() => act(() => api.admin.updateZone(zone.zoneId, { active: true }))}
                    className="text-xs font-bold text-brand underline"
                  >
                    다시 표시
                  </button>
                </div>
              ))}
            </Card>
          </section>
        )}
        <CsvDownload
          label="혼잡도 이력 CSV 내려받기"
          filename="kufim-congestion.csv"
          load={api.admin.congestionCsv}
        />
      </div>
      <ConfirmDialog
        open={!!deleting}
        title="구역 삭제"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting!
          setDeleting(null)
          void act(() => api.admin.deleteZone(target.zoneId))
        }}
        confirmLabel="삭제하기"
        cancelLabel="닫기"
        admin
      >
        {deleting?.name}을(를) 삭제할까요?
        <br />
        입력 이력이 있는 구역은 삭제되지 않으니 숨기기를 사용하세요.
      </ConfirmDialog>
    </Page>
  )
}

function ZoneInputCard({
  zone,
  now,
  onRecord,
  onDeactivate,
  onDelete,
}: {
  zone: ApiAdminZone
  now: number
  onRecord: (level: CongestionLevel, people: number | null) => Promise<void>
  onDeactivate: () => void
  onDelete: () => void
}) {
  const [people, setPeople] = useState(zone.estimatedPeople?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const overdue = !zone.updatedAt || now - Date.parse(zone.updatedAt) > RECOMMENDED_MS
  const count = people === '' ? null : Math.min(9999, Math.max(0, Number(people)))
  const step = (delta: number) =>
    setPeople(String(Math.min(9999, Math.max(0, (count ?? 0) + delta))))
  const record = async (level: CongestionLevel) => {
    setSaving(true)
    await onRecord(level, count)
    setSaving(false)
  }
  return (
    <Card className={`flex flex-col gap-3 p-4 ${overdue ? 'ring-2 ring-[#ff9955]' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold">{zone.name}</h2>
          <p className={`mt-1 text-xs ${overdue ? 'font-bold text-[#93380A]' : 'text-muted'}`}>
            {relativeTime(zone.updatedAt, now)} 입력
            {zone.recordedBy && ` · ${zone.recordedBy}`}
            {overdue && ' · 갱신 필요'}
          </p>
        </div>
        <CongestionBadge zone={zone} now={now} />
      </div>
      <div className="flex items-center gap-2" role="group" aria-label={`${zone.name} 추정 인원`}>
        <button
          type="button"
          onClick={() => step(-50)}
          className="h-10 w-14 rounded-[13px] bg-[#efefef] font-bold"
        >
          −50
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={9999}
          value={people}
          onChange={(e) => setPeople(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="인원(선택)"
          aria-label={`${zone.name} 추정 인원`}
          className="h-10 min-w-0 flex-1 rounded-[13px] bg-[#efefef] text-center text-base font-bold"
        />
        <button
          type="button"
          onClick={() => step(50)}
          className="h-10 w-14 rounded-[13px] bg-[#efefef] font-bold"
        >
          +50
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {congestionLevels.map((level) => {
          const style = congestionStyles[level]
          return (
            <button
              key={level}
              type="button"
              disabled={saving}
              onClick={() => record(level)}
              className="h-14 rounded-[13px] border-2 text-lg font-bold disabled:opacity-60"
              style={{ background: style.bg, color: style.fg, borderColor: style.border }}
            >
              {style.label}
            </button>
          )
        })}
      </div>
      <div className="flex justify-end gap-4 text-xs font-bold text-muted">
        <button type="button" onClick={onDeactivate} className="underline">
          숨기기
        </button>
        {!zone.updatedAt && (
          <button type="button" onClick={onDelete} className="text-danger underline">
            삭제
          </button>
        )}
      </div>
    </Card>
  )
}
