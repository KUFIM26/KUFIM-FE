import axios from 'axios'
import { useAuth } from '../app/auth-context'
import { pollEvery, realtimeEnabled, useRealtimeConnected, useTopic } from '../apis/realtime'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useFestival } from '../app/festival-context'
import { BottomActions, Page } from '../components/layout'
import { Asset, Button, Card, ConfirmDialog, EmptyState, SectionTitle } from '../components/ui'
import { FestivalMeta, Stats } from '../components/festival'
import { RequestState } from '../components/RequestState'
import { useAction, useResource } from '../hooks/useResource'
import { useWaitingApi } from '../hooks/useWaitingApi'
import { useBoothApi } from '../hooks/useBoothApi'
import { acceptingLabels } from '../apis/adapters'
import type { AcceptingStatus, QueueItem, WaitingConfig, ApiResponse } from '../apis/type'
import { NotFoundPage } from './UtilityPages'
const waitingAssets = '/assets/figma/admin-waiting'

export function AdminWaitingListPage() {
  const { booths } = useFestival()
  const items = booths.filter((b) => b.period !== 'facility' && b.waitingEnabled)
  return (
    <Page title="QR 웨이팅 관리" back="/admin">
      <div className="page-pad">
        <SectionTitle>부스 명단</SectionTitle>
        <Card>
          {items.map((b) => (
            <Link
              key={b.id}
              to={`/admin/waiting/${b.id}`}
              className="block border-b border-[#eee] p-4 font-bold"
            >
              {b.name}
            </Link>
          ))}
        </Card>
        {!items.length && <EmptyState>운영할 웨이팅 부스가 없습니다.</EmptyState>}
      </div>
    </Page>
  )
}
export function AdminQueuePage() {
  const { boothId = '' } = useParams()
  const { booths } = useFestival()
  const booth = booths.find((b) => b.id === boothId && b.period !== 'facility')
  const loader = useCallback(
    async () => (await useWaitingApi.queue(Number(boothId))).data.data,
    [boothId],
  )
  const connected = useRealtimeConnected()
  const resource = useResource(loader, pollEvery(connected, 5000))
  const live = useTopic(`/topic/admin/booth/${boothId}/waiting`, resource.refresh)
  const [cancel, setCancel] = useState<QueueItem | null>(null)
  const [message, setMessage] = useState('')
  const action = useAction()
  const callKeys = useRef(new Map<string, string>())
  if (!booth) return <NotFoundPage />
  const queue = resource.data
  const items = queue?.content.filter((w) => w.status === 'WAITING' || w.status === 'CALLED') || []
  const call = (item: QueueItem) =>
    void action.run(async () => {
      const key = callKeys.current.get(item.waitingId) || crypto.randomUUID()
      callKeys.current.set(item.waitingId, key)
      const response = await useWaitingApi.call(item.waitingId, key)
      callKeys.current.delete(item.waitingId)
      setMessage(
        response.data.data.smsStatus === 'NOT_CONFIGURED'
          ? '호출되었습니다. 문자 발송은 아직 연결되지 않아 대기표와 앱 알림으로 안내됩니다.'
          : '호출되었습니다.',
      )
      await resource.refresh()
    })
  return (
    <Page
      title={booth.name}
      back="/admin/waiting"
      className="admin-queue-page"
      backIcon={`${waitingAssets}/back.svg`}
    >
      <div className="page-pad">
        <section className="green-gradient rounded-xl p-3.5 text-white shadow-card">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-2">
              <FestivalMeta />
              <h2 className="text-base font-bold">부스 운영 대시보드</h2>
            </div>
            <Link
              aria-label="부스 설정"
              to={`/admin/waiting/${boothId}/settings`}
              className="shrink-0"
            >
              <Asset src={`${waitingAssets}/settings.svg`} />
            </Link>
          </div>
          {queue && (
            <Stats
              items={[
                { label: '현재 대기 인원', value: `${queue.waitingTeamCount}팀` },
                { label: '예상 대기시간', value: `${queue.estimatedWaitMinutes}분` },
                { label: '부스 운영 현황', value: acceptingLabels[queue.acceptingStatus] },
              ]}
            />
          )}
        </section>
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
        <RequestState error={action.error} />
        {message && (
          <p role="status" className="text-sm text-brand">
            {message}
          </p>
        )}
        <span className="sr-only" role="status">
          {live
            ? '실시간 연결됨'
            : realtimeEnabled
              ? '실시간 연결 대기 · 주기적으로 갱신 중'
              : '주기적으로 갱신 중'}
        </span>
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <Asset src={`${waitingAssets}/list.svg`} />
            대기 명단
          </h2>
          {queue && !items.length && <EmptyState>현재 대기 중인 팀이 없어요.</EmptyState>}
          {items.map((item) => (
            <Card key={item.waitingId} className="flex flex-col gap-2 px-3.5 py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-base font-bold">
                    <span>{item.waitingNumber}번</span>
                    <span className="h-[17px] w-px bg-black" />
                    <span>{item.partySize}명</span>
                  </h3>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium">
                    <span>{item.studentNumberMasked}</span>
                    <span className="h-3 w-px bg-black" />
                    <span>{item.phoneNumberMasked}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-0.5">
                  <span className="text-[8px] font-semibold">경과시간</span>
                  <span
                    className={`flex h-8 w-[60px] items-center justify-center rounded-xl text-base font-bold ${item.status === 'CALLED' ? 'bg-[#ffbd86] text-[#3b1200]' : 'bg-[#9edda0] text-[#023504]'}`}
                  >
                    {item.elapsedMinutes}분
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  disabled={action.pending}
                  className="queue-action !bg-[#9edda0] !bg-none !text-[#023504]"
                  onClick={() => call(item)}
                >
                  호출하기
                </Button>
                <Button
                  tone="blue"
                  className="queue-action"
                  disabled={action.pending}
                  onClick={() =>
                    void action.run(async () => {
                      await useWaitingApi.enter(item.waitingId)
                      await resource.refresh()
                    })
                  }
                >
                  입장 완료
                </Button>
                <Button
                  tone="red"
                  className="queue-action !bg-[#ffa3a3] !text-[#3b0500]"
                  disabled={action.pending}
                  onClick={() => setCancel(item)}
                >
                  취소하기
                </Button>
              </div>
              {item.calledAt && (
                <p className="text-center text-[10px] font-medium">
                  {new Intl.DateTimeFormat('ko-KR', {
                    timeZone: 'Asia/Seoul',
                    hour: '2-digit',
                    minute: '2-digit',
                    hourCycle: 'h23',
                  }).format(new Date(item.calledAt))}{' '}
                  호출완료 / 호출한지{' '}
                  {Math.max(
                    0,
                    Math.floor((Date.parse(queue!.serverTime) - Date.parse(item.calledAt)) / 60000),
                  )}
                  분 째
                </p>
              )}
            </Card>
          ))}
        </section>
      </div>
      <ConfirmDialog
        open={!!cancel}
        title="웨이팅 취소하기"
        admin
        onClose={() => setCancel(null)}
        onConfirm={() => {
          if (cancel)
            void action.run(async () => {
              await useWaitingApi.cancel(cancel.waitingId)
              setCancel(null)
              await resource.refresh()
            })
        }}
      >
        정말 {cancel?.waitingNumber}번의 웨이팅을 취소하시겠습니까?
        {action.error && (
          <span role="alert" className="block text-danger">
            {action.error}
          </span>
        )}
      </ConfirmDialog>
    </Page>
  )
}
export function AdminSettingsPage() {
  const { boothId = '' } = useParams()
  const { booths } = useFestival()
  const booth = booths.find((b) => b.id === boothId && b.period !== 'facility')
  const loader = useCallback(
    async () => (await useWaitingApi.config(Number(boothId))).data.data,
    [boothId],
  )
  const resource = useResource(loader)
  if (!booth) return <NotFoundPage />
  if (!resource.data)
    return (
      <Page title="부스 설정" back={`/admin/waiting/${boothId}`}>
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
      </Page>
    )
  return (
    <SettingsForm key={boothId} boothId={booth.apiId} name={booth.name} initial={resource.data} />
  )
}
function SettingsForm({
  boothId,
  name,
  initial,
}: {
  boothId: number
  name: string
  initial: WaitingConfig
}) {
  const [status, setStatus] = useState<AcceptingStatus>(initial.acceptingStatus)
  const [qrUrl, setQrUrl] = useState('')
  const { account } = useAuth()
  const qrAction = useAction()
  const { refresh } = useFestival()
  const action = useAction()
  const navigate = useNavigate()
  const back = `/admin/waiting/${boothId}`
  const qrLoader = useCallback(async () => {
    try {
      return (await useBoothApi.qr(boothId)).data
    } catch (error) {
      if (
        axios.isAxiosError<ApiResponse<unknown>>(error) &&
        error.response?.data?.error?.code === 'B002'
      )
        return null
      throw error
    }
  }, [boothId])
  const qr = useResource(qrLoader)
  useEffect(() => {
    if (!qr.data) return
    const url = URL.createObjectURL(qr.data)
    // The object URL is an external resource whose lifetime is managed by this effect.
    // eslint-disable-next-line react/set-state-in-effect
    setQrUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [qr.data])
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    void action.run(async () => {
      await useWaitingApi.updateConfig(boothId, {
        acceptingStatus: status,
        estimateMinutesPerTeam: Number(data.get('minutes')),
      })
      await refresh()
      navigate(back)
    })
  }
  return (
    <Page
      title={name}
      back={back}
      className="admin-settings-page pb-28"
      backIcon={`${waitingAssets}/back.svg`}
    >
      <form id="settings-form" onSubmit={submit} className="page-pad">
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <Asset src={`${waitingAssets}/dot.svg`} />
            부스 운영 현황
          </h2>
          <Card className="flex gap-2 px-3.5 py-2">
            {(Object.keys(acceptingLabels) as AcceptingStatus[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
                className={`h-10 min-w-0 flex-1 rounded-[13px] text-base font-bold shadow-[1px_1px_1px_#0000001a] ${status === value ? 'bg-[#9edda0] text-[#023504]' : 'bg-[#d0d0d0] text-[#1d1d1d]'}`}
              >
                {acceptingLabels[value]}
              </button>
            ))}
          </Card>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <Asset src={`${waitingAssets}/dot.svg`} />
            1명(팀)당 예상 대기 시간
          </h2>
          <Card className="flex items-center justify-center gap-2 py-2 font-bold text-base">
            <input
              aria-label="1팀당 예상 대기 시간 (분)"
              className="h-10 w-[109px] rounded-[13px] bg-[#efefef] text-center shadow-[1px_1px_1px_#0000001a] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              name="minutes"
              type="number"
              min={1}
              max={360}
              required
              defaultValue={initial.estimateMinutesPerTeam}
            />
            <span>분</span>
          </Card>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <Asset src={`${waitingAssets}/dot.svg`} />
            호출 후 자동 취소 소요 시간
          </h2>
          <Card className="flex items-center justify-center gap-2 py-2 font-bold text-base">
            <input
              aria-label="호출 후 자동 취소 소요 시간 (분)"
              className="h-10 w-[109px] rounded-[13px] bg-[#efefef] text-center shadow-[1px_1px_1px_#0000001a]"
              value={initial.autoCancelMinutes}
              readOnly
              aria-readonly="true"
            />
            <span>분</span>
          </Card>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <Asset src={`${waitingAssets}/dot.svg`} />
            대기 QR 보기
          </h2>
          <RequestState loading={qr.loading} error={qr.error} retry={() => void qr.refresh()} />
          {!qr.loading && !qr.error && qr.data === null && (
            <Card className="flex flex-col gap-3 p-4">
              <p className="text-sm">아직 발급된 QR 코드가 없습니다.</p>
              {account?.role === 'SUPER_ADMIN' ? (
                <Button
                  disabled={qrAction.pending}
                  onClick={() =>
                    void qrAction.run(async () => {
                      await useBoothApi.issueQr(boothId)
                      await qr.refresh()
                    })
                  }
                >
                  {qrAction.pending ? '발급 중…' : 'QR 코드 발급하기'}
                </Button>
              ) : (
                <p className="text-xs text-muted">총괄 관리자에게 QR 발급을 요청해주세요.</p>
              )}
            </Card>
          )}
          <RequestState error={qrAction.error} />
          {qrUrl && (
            <Card className="flex flex-col items-center gap-5 p-5">
              <img
                src={qrUrl}
                alt={`${name} 웨이팅 접수 QR 코드`}
                className="h-[140px] w-[140px]"
              />
              <a
                href={qrUrl}
                download={`booth-${boothId}-qr.png`}
                className="flex h-8 w-[115px] items-center justify-center rounded-[13px] bg-[#90c4ff] text-sm font-bold text-[#00153b] shadow-[1px_1px_1px_#0000001a]"
              >
                PNG 저장하기
              </a>
            </Card>
          )}
        </section>
        <RequestState error={action.error} />
      </form>
      <BottomActions>
        <Button
          tone="blue"
          type="submit"
          form="settings-form"
          disabled={action.pending}
          className="!min-h-12 !py-2 !text-base"
        >
          저장하기
        </Button>
        <Button
          tone="red"
          className="!min-h-12 !bg-[#ffa3a3] !py-2 !text-base !text-[#3b0500]"
          onClick={() => navigate(back)}
        >
          취소하기
        </Button>
      </BottomActions>
    </Page>
  )
}
