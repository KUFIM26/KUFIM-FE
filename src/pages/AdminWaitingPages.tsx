import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useFestival } from '../app/festival-context'
import { BottomActions, Page } from '../components/layout'
import { Button, Card, ConfirmDialog, EmptyState, SectionTitle } from '../components/ui'
import { FestivalMeta, Stats } from '../components/festival'
import { RequestState } from '../components/RequestState'
import { useAction, useResource } from '../hooks/useResource'
import { useWaitingApi } from '../hooks/useWaitingApi'
import { useBoothApi } from '../hooks/useBoothApi'
import { acceptingLabels, dateText, waitingLabels } from '../apis/adapters'
import type { AcceptingStatus, QueueItem, WaitingConfig } from '../apis/type'
import { NotFoundPage } from './UtilityPages'

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
  const resource = useResource(loader, 5000)
  const [cancel, setCancel] = useState<QueueItem | null>(null)
  const [contact, setContact] = useState<{ id: string; phone: string } | null>(null)
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
    <Page title={booth.name} back="/admin/waiting">
      <div className="page-pad">
        <section className="green-gradient rounded-xl p-4 text-white">
          <FestivalMeta />
          <div className="my-3 flex justify-between">
            <h2 className="font-bold">부스 운영 대시보드</h2>
            <Link className="underline" to={`/admin/waiting/${boothId}/settings`}>
              부스 설정
            </Link>
          </div>
          {queue && (
            <Stats
              items={[
                { label: '현재 대기', value: `${queue.waitingTeamCount}팀` },
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
        <SectionTitle>대기 명단</SectionTitle>
        {queue && !items.length && <EmptyState>현재 대기 중인 팀이 없어요.</EmptyState>}
        {items.map((item) => (
          <Card key={item.waitingId} className="p-4">
            <div className="flex justify-between">
              <h3 className="font-bold">
                {item.waitingNumber}번 | {item.partySize}명
              </h3>
              <span className="text-sm">{waitingLabels[item.status]}</span>
            </div>
            <p className="mt-2 text-xs">
              {item.studentNumberMasked} | {item.phoneNumberMasked}
            </p>
            <p className="mt-2 text-xs">
              경과 {item.elapsedMinutes}분
              {item.calledAt && ` · 최초 호출 ${dateText(item.calledAt)}`}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button disabled={action.pending} onClick={() => call(item)}>
                {item.status === 'CALLED' ? '재호출' : '호출하기'}
              </Button>
              <Button
                tone="blue"
                disabled={action.pending}
                onClick={() =>
                  void action.run(async () => {
                    const r = await useWaitingApi.contact(item.waitingId)
                    setContact({ id: item.waitingId, phone: r.data.data.phoneNumber })
                  })
                }
              >
                전화하기
              </Button>
              <Button tone="red" disabled={action.pending} onClick={() => setCancel(item)}>
                취소하기
              </Button>
            </div>
            {contact?.id === item.waitingId && (
              <a
                className="mt-3 block text-center text-brand underline"
                href={`tel:${contact.phone}`}
              >
                {contact.phone} 연결
              </a>
            )}
            {item.status === 'CALLED' && (
              <div className="mt-2 flex gap-2">
                <Button
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
                  tone="gray"
                  disabled={action.pending}
                  onClick={() =>
                    void action.run(async () => {
                      await useWaitingApi.noShow(item.waitingId)
                      await resource.refresh()
                    })
                  }
                >
                  노쇼 처리
                </Button>
              </div>
            )}
          </Card>
        ))}
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
  const { refresh } = useFestival()
  const action = useAction()
  const navigate = useNavigate()
  const back = `/admin/waiting/${boothId}`
  const qrLoader = useCallback(async () => (await useBoothApi.qr(boothId)).data, [boothId])
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
    <Page title={name} back={back} className="pb-28">
      <form id="settings-form" onSubmit={submit} className="page-pad">
        <SectionTitle>부스 운영 현황</SectionTitle>
        <div className="flex gap-2">
          {(Object.keys(acceptingLabels) as AcceptingStatus[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
              className={`flex-1 rounded-xl p-3 text-sm font-bold ${status === value ? 'bg-brand text-white' : 'bg-white'}`}
            >
              {acceptingLabels[value]}
            </button>
          ))}
        </div>
        <label className="form-field">
          1팀당 예상 대기 시간 (분)
          <input
            className="form-control"
            name="minutes"
            type="number"
            min={1}
            max={360}
            required
            defaultValue={initial.estimateMinutesPerTeam}
          />
        </label>
        <label className="form-field">
          호출 후 자동 취소 소요 시간 (분)
          <input className="form-control" value={10} readOnly aria-readonly="true" />
          <span className="text-xs text-muted">최초 호출 후 10분으로 고정됩니다.</span>
        </label>
        <SectionTitle>대기 QR 보기</SectionTitle>
        <RequestState loading={qr.loading} error={qr.error} retry={() => void qr.refresh()} />
        {qrUrl && (
          <Card className="flex flex-col items-center gap-4 p-5">
            <img src={qrUrl} alt={`${name} 웨이팅 접수 QR 코드`} className="h-52 w-52" />
            <a href={qrUrl} download={`booth-${boothId}-qr.png`} className="text-brand underline">
              PNG 저장하기
            </a>
          </Card>
        )}
        <RequestState error={action.error} />
      </form>
      <BottomActions>
        <Button type="submit" form="settings-form" disabled={action.pending}>
          저장하기
        </Button>
        <Button tone="gray" onClick={() => navigate(back)}>
          취소하기
        </Button>
      </BottomActions>
    </Page>
  )
}
