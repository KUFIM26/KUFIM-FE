import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDemo } from '../app/demo-context'
import { useAdminSession } from '../app/admin-session'
import { BottomActions, InlineError, Page } from '../components/layout'
import { Asset, Button, Card, ConfirmDialog, EmptyState, SectionTitle } from '../components/ui'
import { FestivalMeta, Stats } from '../components/festival'
import { figmaAssets as assets } from '../data/figma-assets'
import { NotFoundPage } from './UtilityPages'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import { kst, minutesBetween } from '../api/mappers'
import { randomUuid } from '../api/token'
import { useAsync } from '../api/useAsync'
import type { AcceptingStatus, ApiAdminTicket, ApiWaitingConfig } from '../api/types'

const statusLabels: Record<AcceptingStatus, string> = {
  OPEN: '운영 중',
  PAUSED: '대기 마감',
  CLOSED: '운영 종료',
}

function useManagedBooth() {
  const { boothId } = useParams()
  const { booths } = useDemo()
  const { canManage } = useAdminSession()
  const booth = booths.find((b) => b.id === boothId && b.period !== 'facility')
  return { booth, allowed: !!booth && canManage(booth.id) }
}
function NotManaged() {
  return (
    <Page title="QR 웨이팅 관리" back="/admin/waiting">
      <div className="page-pad">
        <EmptyState>담당 부스가 아니라서 운영할 수 없어요.</EmptyState>
      </div>
    </Page>
  )
}

export function LiveAdminWaitingListPage() {
  const { booths } = useDemo()
  const { canManage } = useAdminSession()
  const items = booths.filter((b) => b.period !== 'facility' && b.waitingEnabled && canManage(b.id))
  return (
    <Page title="QR 웨이팅 관리" back="/admin">
      <div className="page-pad">
        <section className="flex flex-col gap-2">
          <SectionTitle>부스 명단</SectionTitle>
          {items.length ? (
            <Card className="overflow-hidden">
              {items.map((booth) => (
                <Link
                  key={booth.id}
                  to={`/admin/waiting/${booth.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 border-b border-[#eee] px-4 py-4 text-base font-bold text-[#383838] last:border-0"
                >
                  {booth.name}
                  <Asset src={assets['118:2061'].imgFrame1597881180} />
                </Link>
              ))}
            </Card>
          ) : (
            <EmptyState>웨이팅을 운영하는 담당 부스가 없어요.</EmptyState>
          )}
        </section>
      </div>
    </Page>
  )
}

export function LiveAdminQueuePage() {
  const { booth, allowed } = useManagedBooth()
  const queue = useAsync(allowed ? () => api.admin.queue(booth!.id) : null, [booth?.id], 5000)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [cancelTarget, setCancelTarget] = useState<ApiAdminTicket | null>(null)
  const [contact, setContact] = useState<{ number: number; phone: string } | null>(null)
  // One key per call attempt: a retry after a lost response must not count as a second recall.
  const callKeys = useRef(new Map<string, string>())
  if (!booth) return <NotFoundPage />
  if (!allowed) return <NotManaged />

  const act = async (waitingId: string, action: () => Promise<unknown>) => {
    setBusy(waitingId)
    setError('')
    try {
      await action()
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(null)
      void queue.reload()
    }
  }
  const call = (item: ApiAdminTicket) =>
    act(item.waitingId, async () => {
      const key = callKeys.current.get(item.waitingId) ?? randomUuid()
      callKeys.current.set(item.waitingId, key)
      try {
        await api.admin.call(item.waitingId, key)
        callKeys.current.delete(item.waitingId)
      } catch (reason) {
        if (reason instanceof ApiError && reason.status >= 400 && reason.status < 500)
          callKeys.current.delete(item.waitingId)
        throw reason
      }
    })
  const showContact = (item: ApiAdminTicket) =>
    act(item.waitingId, async () => {
      const result = await api.admin.contact(item.waitingId)
      setContact({ number: item.waitingNumber, phone: result.phoneNumber })
    })

  const data = queue.data
  const rows = (data?.content ?? []).filter((w) => w.status === 'WAITING' || w.status === 'CALLED')
  return (
    <Page title={booth.name} back="/admin/waiting">
      <div className="page-pad">
        <section className="green-gradient flex flex-col gap-2 rounded-xl p-3.5 text-white shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <FestivalMeta />
              <h2 className="mt-2 text-base font-bold">부스 운영 대시보드</h2>
            </div>
            <Link to={`/admin/waiting/${booth.id}/settings`} aria-label="부스 설정">
              <Asset src={assets['63:2'].imgVector1} />
            </Link>
          </div>
          <Stats
            items={[
              { label: '현재 대기 인원', value: data ? `${data.waitingTeamCount}팀` : '-' },
              { label: '예상 대기시간', value: data ? `${data.estimatedWaitMinutes}분` : '-' },
              {
                label: '부스 운영 현황',
                value: data ? statusLabels[data.acceptingStatus] : '-',
              },
            ]}
          />
        </section>
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {error}
          </p>
        )}
        <section className="flex flex-col gap-2">
          <SectionTitle>대기 명단</SectionTitle>
          {queue.error && !data ? (
            <InlineError error={queue.error} onRetry={queue.reload} />
          ) : !data ? (
            <EmptyState>대기 명단을 불러오는 중이에요.</EmptyState>
          ) : rows.length ? (
            rows.map((item) => {
              const called = item.status === 'CALLED'
              const disabled = busy === item.waitingId
              const sinceCall = item.calledAt ? minutesBetween(item.calledAt, data.serverTime) : 0
              return (
                <Card
                  className={`px-3.5 py-4 ${called ? 'ring-2 ring-[#9edda0]' : ''}`}
                  key={item.waitingId}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="flex gap-2 text-base font-bold">
                        <span>{item.waitingNumber}번</span>
                        <span className="font-normal">|</span>
                        <span>{item.partySize}명</span>
                      </h3>
                      <p className="mt-1.5 text-xs">
                        {item.studentNumberMasked}
                        <span className="mx-1.5">|</span>
                        {item.phoneNumberMasked}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="mb-0.5 text-[8px]">경과시간</p>
                      <strong
                        className={`flex h-8 w-[60px] items-center justify-center rounded-[13px] text-base ${item.elapsedMinutes >= 20 ? 'bg-[#ffbd86] text-[#3b1200]' : 'bg-[#9edda0] text-[#023504]'}`}
                      >
                        {item.elapsedMinutes}분
                      </strong>
                    </div>
                  </div>
                  <div className={`mt-2 grid gap-2 ${called ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    {called && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => act(item.waitingId, () => api.admin.enter(item.waitingId))}
                        className="h-10 rounded-[13px] bg-[#1c8944] text-sm font-bold text-white disabled:opacity-50"
                      >
                        입장 완료
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={disabled}
                      className={`h-10 rounded-[13px] bg-[#9edda0] font-bold text-[#023504] disabled:opacity-50 ${called ? 'text-sm' : 'text-base'}`}
                      onClick={() => call(item)}
                    >
                      {called ? '재호출' : '호출하기'}
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => showContact(item)}
                      className={`h-10 rounded-[13px] bg-[#90c4ff] font-bold text-[#00153b] disabled:opacity-50 ${called ? 'text-sm' : 'text-base'}`}
                    >
                      전화하기
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setCancelTarget(item)}
                      className={`h-10 rounded-[13px] bg-[#ffa3a3] font-bold text-[#3b0500] disabled:opacity-50 ${called ? 'text-sm' : 'text-base'}`}
                    >
                      취소하기
                    </button>
                  </div>
                  {called && item.calledAt && (
                    <p className="mt-2 text-center text-[10px]" role="status">
                      {kst(item.calledAt).time} 호출완료 / 호출한지 {sinceCall}분 째
                      {item.recallCount > 0 && ` / 재호출 ${item.recallCount}회`}
                      {item.autoCancelAt && ` / ${kst(item.autoCancelAt).time} 자동 취소`}
                    </p>
                  )}
                </Card>
              )
            })
          ) : (
            <EmptyState>현재 대기 중인 팀이 없어요.</EmptyState>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={!!cancelTarget}
        title="웨이팅 취소하기"
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          const target = cancelTarget!
          setCancelTarget(null)
          void act(target.waitingId, () => api.admin.cancel(target.waitingId))
        }}
        admin
      >
        정말 {cancelTarget?.waitingNumber}번의 웨이팅을 취소하시겠습니까?
      </ConfirmDialog>
      <ConfirmDialog
        open={!!contact}
        title="전화 연결"
        onClose={() => setContact(null)}
        onConfirm={() => {
          window.location.href = `tel:${contact!.phone}`
          setContact(null)
        }}
        confirmLabel="전화 걸기"
        cancelLabel="닫기"
      >
        {contact?.number}번 대기자
        <br />
        <strong className="text-base">{contact?.phone}</strong>
        <br />
        <span className="text-xs text-muted">연락처 열람 기록이 남습니다.</span>
      </ConfirmDialog>
    </Page>
  )
}

export function LiveAdminSettingsPage() {
  const { booth, allowed } = useManagedBooth()
  const config = useAsync(allowed ? () => api.admin.waitingConfig(booth!.id) : null, [booth?.id])
  if (!booth) return <NotFoundPage />
  if (!allowed) return <NotManaged />
  const back = `/admin/waiting/${booth.id}`
  return (
    <Page title={booth.name} back={back} className="pb-28">
      {config.data ? (
        <SettingsForm boothId={booth.id} back={back} initial={config.data} />
      ) : (
        <div className="page-pad">
          {config.error ? (
            <InlineError error={config.error} onRetry={config.reload} />
          ) : (
            <EmptyState>설정을 불러오는 중이에요.</EmptyState>
          )}
        </div>
      )}
    </Page>
  )
}

function SettingsForm({
  boothId,
  back,
  initial,
}: {
  boothId: string
  back: string
  initial: ApiWaitingConfig
}) {
  const navigate = useNavigate()
  const { account } = useAdminSession()
  const [status, setStatus] = useState(initial.acceptingStatus)
  const [minutes, setMinutes] = useState(String(initial.estimateMinutesPerTeam))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const qr = useAsync(() => api.admin.qrPng(boothId), [boothId])
  const qrUrl = useMemo(() => (qr.data ? URL.createObjectURL(qr.data) : undefined), [qr.data])
  useEffect(
    () => () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl)
    },
    [qrUrl],
  )
  const qrMissing = qr.error instanceof ApiError && qr.error.code === 'B002'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.admin.updateWaitingConfig(boothId, {
        acceptingStatus: status,
        estimateMinutesPerTeam: Number(minutes),
      })
      navigate(back)
    } catch (reason) {
      setError((reason as Error).message)
      setSaving(false)
    }
  }
  const issue = async () => {
    setError('')
    try {
      await api.admin.issueQr(boothId)
      void qr.reload()
    } catch (reason) {
      setError((reason as Error).message)
    }
  }
  return (
    <>
      <form id="settings-form" onSubmit={submit} className="page-pad">
        <section className="form-field">
          <SectionTitle dot>부스 운영 현황</SectionTitle>
          <Card className="flex gap-2 px-3.5 py-2">
            {(Object.keys(statusLabels) as AcceptingStatus[]).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
                className={`h-10 flex-1 rounded-[13px] text-base font-bold ${status === value ? 'bg-[#9edda0] text-[#023504]' : 'bg-[#d0d0d0] text-[#1d1d1d]'}`}
              >
                {statusLabels[value]}
              </button>
            ))}
          </Card>
        </section>
        <label className="form-field">
          <SectionTitle dot>1명(팀)당 예상 대기 시간</SectionTitle>
          <Card className="flex items-center justify-center gap-2 px-3.5 py-2">
            <input
              className="h-10 w-[109px] rounded-[13px] bg-[#efefef] text-center text-base font-bold"
              name="minutes"
              type="number"
              min={1}
              max={360}
              required
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
            <span className="text-base font-bold">분</span>
          </Card>
        </label>
        <label className="form-field">
          <SectionTitle dot>호출 후 자동 취소 소요 시간</SectionTitle>
          <Card className="flex flex-col items-center gap-1 px-3.5 py-2">
            <span className="flex items-center gap-2">
              <input
                className="h-10 w-[109px] rounded-[13px] bg-[#efefef] text-center text-base font-bold text-muted"
                type="number"
                readOnly
                value={initial.autoCancelMinutes}
              />
              <span className="text-base font-bold">분</span>
            </span>
            <span className="text-xs text-muted">모든 부스에 같은 시간이 적용돼요.</span>
          </Card>
        </label>
        <section className="form-field">
          <SectionTitle dot>대기 QR 보기</SectionTitle>
          <Card className="flex flex-col items-center gap-5 py-5">
            {qrUrl ? (
              <>
                <img src={qrUrl} alt="부스 웨이팅 접수 QR 코드" className="size-[180px]" />
                <a
                  href={qrUrl}
                  download={`booth-${boothId}-qr.png`}
                  className="rounded-[13px] bg-[#90c4ff] px-4 py-2 text-sm font-bold text-[#00153b]"
                >
                  PNG 저장하기
                </a>
              </>
            ) : qrMissing ? (
              <>
                <p className="text-sm text-muted">아직 발급된 QR이 없어요.</p>
                {account?.role === 'SUPER_ADMIN' ? (
                  <button
                    type="button"
                    onClick={issue}
                    className="rounded-[13px] bg-[#90c4ff] px-4 py-2 text-sm font-bold text-[#00153b]"
                  >
                    QR 발급하기
                  </button>
                ) : (
                  <p className="text-xs text-muted">총괄 관리자에게 발급을 요청해주세요.</p>
                )}
              </>
            ) : qr.error ? (
              <InlineError error={qr.error} onRetry={qr.reload} />
            ) : (
              <p className="text-sm text-muted">QR을 불러오는 중이에요.</p>
            )}
          </Card>
        </section>
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {error}
          </p>
        )}
      </form>
      <BottomActions>
        <Button
          type="submit"
          form="settings-form"
          tone="blue"
          className="!text-base"
          disabled={saving}
        >
          {saving ? '저장 중…' : '저장하기'}
        </Button>
        <Button
          className="!bg-[#ffa3a3] !bg-none !text-base !text-[#3b0500]"
          onClick={() => navigate(back)}
        >
          취소하기
        </Button>
      </BottomActions>
    </>
  )
}
