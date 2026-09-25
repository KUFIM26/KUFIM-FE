import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDemo } from '../app/demo-context'
import { BottomActions, Page } from '../components/layout'
import { Asset, Button, Card, ConfirmDialog, EmptyState, SectionTitle } from '../components/ui'
import { FestivalMeta, Stats } from '../components/festival'
import { figmaAssets as assets } from '../data/figma-assets'
import { NotFoundPage } from './UtilityPages'

export function AdminWaitingListPage() {
  const { booths } = useDemo()
  return (
    <Page title="QR 웨이팅 관리" back="/admin">
      <div className="page-pad">
        <section className="flex flex-col gap-2">
          <SectionTitle>부스 명단</SectionTitle>
          <Card className="overflow-hidden">
            {booths
              .filter((b) => b.period !== 'facility')
              .map((booth, i) => (
                <Link
                  key={booth.id}
                  to={`/admin/waiting/${booth.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 border-b border-[#eee] px-4 py-4 text-base font-bold text-[#383838] last:border-0"
                >
                  {i < 3 ? `총학생회${i + 1} -` : booth.name}
                  <Asset src={assets['118:2061'].imgFrame1597881180} />
                </Link>
              ))}
          </Card>
        </section>
      </div>
    </Page>
  )
}
export function AdminQueuePage() {
  const { boothId } = useParams()
  const { booths, queue, setQueue, settings } = useDemo()
  const [params, setParams] = useSearchParams()
  const [cancelId, setCancelId] = useState<string | null>(
    params.get('dialog') === 'cancel' ? '12' : null,
  )
  const [callInfo, setCallInfo] = useState(false)
  const booth = booths.find((b) => b.id === boothId && b.period !== 'facility')
  if (!booth) return <NotFoundPage />
  const currentQueue = queue.filter((q) => q.boothId === boothId)
  const config = settings[booth.id] ?? { status: '운영 중', minutes: 50, cancelMinutes: 10 }
  const close = () => {
    setCancelId(null)
    setParams({}, { replace: true })
  }
  return (
    <Page
      title={booth.id === 'booth-1' ? '총학생회 부스 1 : 인연' : booth.name}
      back="/admin/waiting"
    >
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
              {
                label: '현재 대기 인원',
                value: `${booth.id === 'booth-1' && currentQueue.length ? currentQueue.length + 10 : currentQueue.length}팀`,
              },
              { label: '예상 대기시간', value: `${config.minutes}분` },
              { label: '부스 운영 현황', value: config.status },
            ]}
          />
        </section>
        <section className="flex flex-col gap-2">
          <SectionTitle>대기 명단</SectionTitle>
          {currentQueue.length ? (
            currentQueue.map((item) => (
              <Card className="px-3.5 py-4" key={item.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex gap-2 text-base font-bold">
                      <span>{item.id}번</span>
                      <span className="font-normal">|</span>
                      <span>{item.people}명</span>
                    </h3>
                    <p className="mt-1.5 text-xs">
                      {item.student}
                      <span className="mx-1.5">|</span>
                      {item.phone}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="mb-0.5 text-[8px]">경과시간</p>
                    <strong
                      className={`flex h-8 w-[60px] items-center justify-center rounded-[13px] text-base ${item.elapsed >= 20 ? 'bg-[#ffbd86] text-[#3b1200]' : 'bg-[#9edda0] text-[#023504]'}`}
                    >
                      {item.elapsed}분
                    </strong>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="h-10 rounded-[13px] bg-[#9edda0] text-base font-bold text-[#023504]"
                    onClick={() =>
                      setQueue((items) =>
                        items.map((q) =>
                          q.id === item.id && q.boothId === boothId ? { ...q, called: true } : q,
                        ),
                      )
                    }
                  >
                    {item.called ? '호출하기' : '호출하기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCallInfo(true)}
                    className="h-10 rounded-[13px] bg-[#90c4ff] text-base font-bold text-[#00153b]"
                  >
                    전화하기
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelId(item.id)}
                    className="h-10 rounded-[13px] bg-[#ffa3a3] text-base font-bold text-[#3b0500]"
                  >
                    취소하기
                  </button>
                </div>
                {item.called && (
                  <p className="mt-2 text-center text-[10px]" role="status">
                    12:30 호출완료 / 호출한지 3분 째
                  </p>
                )}
              </Card>
            ))
          ) : (
            <EmptyState>현재 대기 중인 팀이 없어요.</EmptyState>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={!!cancelId}
        title="웨이팅 취소하기"
        onClose={close}
        onConfirm={() => {
          setQueue((items) => items.filter((q) => !(q.id === cancelId && q.boothId === boothId)))
          close()
        }}
        admin
      >
        정말 {cancelId}번의 웨이팅을 취소하시겠습니까?
      </ConfirmDialog>
      <ConfirmDialog
        open={callInfo}
        title="전화 연결 안내"
        onClose={() => setCallInfo(false)}
        onConfirm={() => setCallInfo(false)}
        confirmLabel="확인"
        cancelLabel="닫기"
      >
        현재 화면은 예시 데이터입니다.
        <br />
        실제 전화는 연결되지 않습니다.
      </ConfirmDialog>
    </Page>
  )
}
export function AdminSettingsPage() {
  const { boothId } = useParams()
  const { booths, settings, setSettings } = useDemo()
  const booth = booths.find((b) => b.id === boothId && b.period !== 'facility')
  const initial = settings[boothId || ''] ?? { status: '운영 중', minutes: 50, cancelMinutes: 10 }
  const [status, setStatus] = useState(initial.status)
  const [downloadError, setDownloadError] = useState('')
  const navigate = useNavigate()
  if (!booth) return <NotFoundPage />
  const back = `/admin/waiting/${booth.id}`
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSettings((previous) => ({
      ...previous,
      [booth.id]: {
        status,
        minutes: Number(data.get('minutes')),
        cancelMinutes: Number(data.get('cancelMinutes')),
      },
    }))
    navigate(back)
  }
  const saveQr = async () => {
    try {
      const picture = new Image()
      picture.src = assets['63:178'].imgBiQrCode
      await picture.decode()
      const canvas = document.createElement('canvas')
      canvas.width = picture.naturalWidth
      canvas.height = picture.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(picture, 0, 0)
      const link = document.createElement('a')
      link.download = 'KUFIM-QR-design-preview.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      setDownloadError('이미지를 저장하지 못했어요. 다시 시도해주세요.')
    }
  }
  return (
    <Page
      title={booth.id === 'booth-1' ? '총학생회 부스 1 : 인연' : booth.name}
      back={back}
      className="pb-28"
    >
      <form id="settings-form" onSubmit={submit} className="page-pad">
        <section className="form-field">
          <SectionTitle dot>부스 운영 현황</SectionTitle>
          <Card className="flex gap-2 px-3.5 py-2">
            {['운영 중', '대기 마감', '운영 종료'].map((label) => (
              <button
                type="button"
                key={label}
                aria-pressed={status === label}
                onClick={() => setStatus(label)}
                className={`h-10 flex-1 rounded-[13px] text-base font-bold ${status === label ? 'bg-[#9edda0] text-[#023504]' : 'bg-[#d0d0d0] text-[#1d1d1d]'}`}
              >
                {label}
              </button>
            ))}
          </Card>
        </section>
        {[
          { name: 'minutes', label: '1명(팀)당 예상 대기 시간', value: initial.minutes },
          {
            name: 'cancelMinutes',
            label: '호출 후 자동 취소 소요 시간',
            value: initial.cancelMinutes,
          },
        ].map((field) => (
          <label className="form-field" key={field.name}>
            <SectionTitle dot>{field.label}</SectionTitle>
            <Card className="flex items-center justify-center gap-2 px-3.5 py-2">
              <input
                className="h-10 w-[109px] rounded-[13px] bg-[#efefef] text-center text-base font-bold"
                name={field.name}
                type="number"
                min={1}
                max={360}
                required
                defaultValue={field.value}
              />
              <span className="text-base font-bold">분</span>
            </Card>
          </label>
        ))}
        <section className="form-field">
          <SectionTitle dot>대기 QR 보기</SectionTitle>
          <Card className="flex flex-col items-center gap-5 py-5">
            <Asset src={assets['63:178'].imgBiQrCode} alt="Figma 디자인의 예시 QR 코드" />
            <button
              type="button"
              onClick={saveQr}
              className="rounded-[13px] bg-[#90c4ff] px-4 py-2 text-sm font-bold text-[#00153b]"
            >
              PNG 저장하기
            </button>
            {downloadError && (
              <p role="alert" className="px-4 text-xs text-danger">
                {downloadError}
              </p>
            )}
          </Card>
        </section>
      </form>
      <BottomActions>
        <Button type="submit" form="settings-form" tone="blue" className="!text-base">
          저장하기
        </Button>
        <Button
          className="!bg-[#ffa3a3] !bg-none !text-base !text-[#3b0500]"
          onClick={() => navigate(back)}
        >
          취소하기
        </Button>
      </BottomActions>
    </Page>
  )
}
