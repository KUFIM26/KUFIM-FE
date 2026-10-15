import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { Page } from '../components/layout'
import { Asset, Button, Card, ConfirmDialog, SectionTitle } from '../components/ui'
import { BoothRow, WaitingNumbers } from '../components/festival'
import { RequestState } from '../components/RequestState'
import { figmaAssets as assets } from '../data/figma-assets'
import { useBoothApi } from '../hooks/useBoothApi'
import { useWaitingApi } from '../hooks/useWaitingApi'
import { pollEvery, useRealtimeConnected, useTopic } from '../apis/realtime'
import { useAction, useResource } from '../hooks/useResource'
import { boothView, dateText, waitingLabels } from '../apis/adapters'
import type { Booth } from '../data/models'
import type { WaitingTicket } from '../apis/type'

export function WaitingInstructions() {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold">이용 방법</h2>
      <ol className="mt-1.5 list-decimal pl-[18px] text-xs">
        <li>지도에서 부스 위치 확인</li>
        <li>부스 현장의 QR을 휴대폰 카메라로 스캔</li>
        <li>정보 입력 후 대기표 확인</li>
        <li>호출 후 10분 안에 입장해주세요.</li>
      </ol>
      <p className="mt-2 text-xs text-muted">호출 여부는 내 대기표와 알림함에서 확인해주세요.</p>
    </Card>
  )
}
export function WaitingPage() {
  const loader = useCallback(async () => (await useWaitingApi.mine()).data.data, [])
  const connected = useRealtimeConnected()
  const resource = useResource(loader, pollEvery(connected, 5000))
  const popularLoader = useCallback(
    async () =>
      (await useBoothApi.findAll({ sort: 'popular', limit: 3, waitingOnly: true })).data.data.map(
        boothView,
      ),
    [],
  )
  const popular = useResource(popularLoader)
  const active = resource.data?.find((t) => t.status === 'WAITING' || t.status === 'CALLED')
  useTopic(active ? `/topic/waiting/${active.waitingId}` : null, resource.refresh)
  useTopic(active ? `/topic/booth/${active.boothId}/waiting` : null, resource.refresh)
  const [cancelOpen, setCancelOpen] = useState(false)
  const action = useAction()
  return (
    <Page title="QR 웨이팅" nav>
      <div className="page-pad !gap-3">
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
        {active ? (
          <section className="flex flex-col gap-2">
            <SectionTitle>{active.boothName}</SectionTitle>
            <Card className="p-4">
              <h2 className="font-bold">{waitingLabels[active.status]}</h2>
              {active.status === 'WAITING' ? (
                <>
                  <p className="mt-1.5 text-[32px] font-bold text-[#0b5225]">
                    {active.position}번째
                  </p>
                  <p className="text-xs">예상 대기 {active.estimatedWaitMinutes}분</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-danger">
                  호출되었습니다. {active.autoCancelAt && dateText(active.autoCancelAt)}까지
                  입장해주세요.
                </p>
              )}
              <p className="mt-2 text-sm">
                웨이팅 번호 <strong>{active.waitingNumber}번</strong> · {active.partySize}명
              </p>
              <p className="mt-1 text-xs">{dateText(active.registeredAt)} 등록</p>
            </Card>
          </section>
        ) : (
          !resource.loading &&
          !resource.error && (
            <section
              role="status"
              className="flex h-[201px] flex-col items-center justify-center gap-[18px] rounded-xl bg-[#e8f5ee] p-3"
            >
              <Asset src="/assets/figma/waiting-empty/alarm.svg" />
              <div className="flex w-full flex-col gap-2 text-center">
                <h2 className="text-lg font-bold">아직 신청한 웨이팅이 없어요.</h2>
                <p className="text-xs font-normal">
                  부스에 직접 방문해 현장 QR을 스캔하면
                  <br />
                  웨이팅을 등록할 수 있어요.
                </p>
              </div>
            </section>
          )
        )}
        {active ? (
          <WaitingInstructions />
        ) : (
          <Card className="p-4">
            <h2 className="text-sm font-bold">이용 방법</h2>
            <div className="mt-1.5 text-xs font-medium">
              <ol className="list-decimal pl-[18px]">
                <li>지도에서 원하는 부스 위치 확인</li>
                <li>해당 부스로 직접 이동</li>
                <li>부스의 QR코드 스캔</li>
                <li>입장 순서가 되면 알림/문자 수신하여 입장</li>
              </ol>
              <p className="pl-[18px]">(호출 후 10분 안에 입장하지 않을 경우 자동 취소)</p>
            </div>
          </Card>
        )}
        <RequestState error={action.error} />
        {active ? (
          <Button tone="red" disabled={action.pending} onClick={() => setCancelOpen(true)}>
            웨이팅 취소하기
          </Button>
        ) : (
          <Link className="primary-button green-gradient" to="/waiting/scan">
            <Asset src="/assets/figma/waiting-empty/qr.svg" />
            부스 QR 스캔하기
          </Link>
        )}
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <Asset src="/assets/figma/waiting-empty/title.svg" />
            현재 가장 인기있는 부스 TOP3
          </h2>
          <RequestState error={popular.error} retry={() => void popular.refresh()} />
          {popular.data?.map((booth) => (
            <Card key={booth.id} className="px-4">
              <BoothRow booth={booth} />
            </Card>
          ))}
        </section>
      </div>
      <ConfirmDialog
        open={cancelOpen}
        title="웨이팅 취소하기"
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          if (active)
            void action.run(async () => {
              await useWaitingApi.delete(active.waitingId)
              setCancelOpen(false)
              await resource.refresh()
            })
        }}
      >
        정말 {active?.boothName}의 웨이팅을 취소하시겠습니까?
        {action.error && (
          <span role="alert" className="block text-danger">
            {action.error}
          </span>
        )}
      </ConfirmDialog>
    </Page>
  )
}
function ScannerBackground() {
  return <div className="relative min-h-[calc(100dvh-68px)] rounded-t-xl bg-black text-white" />
}
export { default as ScanPage } from './QrScanPage'
export function QrEntryPage() {
  const { boothCode = '' } = useParams()
  const loader = useCallback(
    async () => (await useBoothApi.findByCode(boothCode)).data.data,
    [boothCode],
  )
  const resource = useResource(loader)
  if (resource.data) return <Navigate to={`/waiting/register/${resource.data.boothId}`} replace />
  return (
    <Page title="QR 웨이팅" back="/waiting">
      <RequestState
        loading={resource.loading}
        error={resource.error}
        retry={() => void resource.refresh()}
      />
    </Page>
  )
}
export function WaitingRegisterPage() {
  const { boothId = '' } = useParams()
  const loader = useCallback(async () => {
    const [booth, mine, status] = await Promise.all([
      useBoothApi.find(Number(boothId)),
      useWaitingApi.mine(),
      useBoothApi.status(Number(boothId)),
    ])
    return {
      booth: {
        ...boothView(booth.data.data),
        teams: status.data.data.waitingTeamCount,
        minutes: status.data.data.estimatedWaitMinutes,
        waitingStatus: status.data.data.effectiveWaitingStatus,
      },
      ticket: mine.data.data.find((t) => t.status === 'WAITING' || t.status === 'CALLED') || null,
    }
  }, [boothId])
  const connected = useRealtimeConnected()
  const resource = useResource(loader, pollEvery(connected, 15000))
  useTopic(`/topic/booth/${boothId}/waiting`, resource.refresh)
  if (!resource.data)
    return (
      <Page title="QR 웨이팅" back="/waiting">
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
      </Page>
    )
  return <RegistrationForm key={boothId} {...resource.data} />
}
function RegistrationForm({ booth, ticket }: { booth: Booth; ticket: WaitingTicket | null }) {
  const action = useAction()
  const retry = useRef({ body: '', key: '' })
  const navigate = useNavigate()
  const sheetRef = useRef<HTMLElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [student, setStudent] = useState('')
  const [phone, setPhone] = useState('')
  const [people, setPeople] = useState('')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  useEffect(() => {
    const sheet = sheetRef.current
    const form = formRef.current
    const scroller = scrollRef.current
    if (!sheet || !form || !scroller) return
    const viewport = window.visualViewport
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    let frame = 0
    const updateViewport = () => {
      const visibleHeight = viewport?.height ?? window.innerHeight
      const visibleBottom = (viewport?.offsetTop ?? 0) + visibleHeight
      sheet.style.height = `${Math.max(160, Math.min(615, visibleHeight - 88))}px`
      sheet.style.bottom = `${Math.max(0, window.innerHeight - visibleBottom)}px`
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const active = document.activeElement
        if (!(active instanceof HTMLElement) || !form.contains(active)) return
        const bounds = scroller.getBoundingClientRect()
        const field = active.getBoundingClientRect()
        if (field.bottom > bounds.bottom - 12)
          scroller.scrollTop += field.bottom - bounds.bottom + 12
        else if (field.top < bounds.top + 12) scroller.scrollTop -= bounds.top + 12 - field.top
      })
    }
    updateViewport()
    form.addEventListener('focusin', updateViewport)
    viewport?.addEventListener('resize', updateViewport)
    viewport?.addEventListener('scroll', updateViewport)
    window.addEventListener('resize', updateViewport)
    return () => {
      document.body.style.overflow = previousOverflow
      form.removeEventListener('focusin', updateViewport)
      viewport?.removeEventListener('resize', updateViewport)
      viewport?.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
      cancelAnimationFrame(frame)
    }
  }, [])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (ticket) {
      navigate('/waiting')
      return
    }
    void action.run(async () => {
      const input = {
        studentNumber: student,
        phoneNumber: phone,
        partySize: Number(people),
        privacyConsent: privacyAgreed,
      }
      const body = JSON.stringify(input)
      if (retry.current.body !== body) retry.current = { body, key: crypto.randomUUID() }
      try {
        await useWaitingApi.make(booth.apiId, input, retry.current.key)
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.data?.error?.code === 'W001') {
          navigate('/waiting', { replace: true })
          return
        }
        throw e
      }
      navigate('/waiting', { replace: true })
    })
  }
  return (
    <Page title="QR 웨이팅" back="/waiting/scan" className="!bg-black">
      <ScannerBackground />
      <section
        ref={sheetRef}
        className="registration-sheet fixed bottom-0 left-1/2 z-40 flex w-full max-w-[393px] -translate-x-1/2 flex-col overflow-hidden rounded-t-xl bg-canvas pt-2 shadow-[0_-2px_2px_rgba(0,0,0,.2)]"
        aria-label="웨이팅 접수"
      >
        <div className="mx-auto mb-4 h-[3px] w-[51px] shrink-0 rounded bg-[#c2c2c2]" />
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[19px]"
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">{booth.name}</h2>
              <p className="mt-1.5 text-sm">
                {booth.place} | {booth.hours}
              </p>
            </div>
            <WaitingNumbers booth={booth} />
          </div>
          <Card className="mt-3 !bg-[#f9f9f9] p-4">
            <h2 className="text-sm font-bold">부스 소개</h2>
            <p className="mt-1.5 text-xs">{booth.description}</p>
          </Card>
          <form
            id="waiting-registration-form"
            ref={formRef}
            className="mt-5 flex flex-col gap-5"
            onSubmit={submit}
          >
            <label className="form-field">
              <span className="flex items-center gap-1.5 text-base font-bold">
                <Asset src={assets['75:550'].imgVector1} />
                학번
              </span>
              <input
                required
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9]{9}"
                maxLength={9}
                value={student}
                onChange={(e) => setStudent(e.target.value.replace(/\D/g, ''))}
                className="form-control"
                placeholder="학번을 입력하세요(9자리)"
                title="학번 9자리를 입력해주세요."
              />
            </label>
            <label className="form-field">
              <span className="flex items-center gap-1.5 text-base font-bold">
                <Asset src={assets['75:550'].imgVector1} />
                전화번호
              </span>
              <input
                required
                autoComplete="off"
                inputMode="tel"
                pattern="[0-9]{11}"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="form-control"
                placeholder="전화번호를 입력하세요(11자리)"
                title="숫자만 11자리 입력해주세요."
              />
            </label>
            <label className="form-field">
              <span className="flex items-center gap-1.5 text-base font-bold">
                <Asset src={assets['75:550'].imgVector1} />
                인원 수
              </span>
              <span className="relative">
                <select
                  required
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                  className={`form-control h-10 appearance-none py-0 pr-10 ${people ? 'text-black' : 'text-[#8b8b8b]'}`}
                >
                  <option value="" disabled>
                    인원 수를 선택하세요
                  </option>
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <option key={count} value={count}>
                      {count}명
                    </option>
                  ))}
                </select>
                <Asset
                  src={assets['75:550'].imgChevronDown}
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                />
              </span>
            </label>
            <div className="form-field">
              <span className="flex items-center gap-1.5 text-base font-bold">
                <Asset src={assets['75:550'].imgVector1} />
                개인정보 활용 동의
              </span>
              <button
                type="button"
                aria-expanded={privacyOpen}
                aria-controls="privacy-details"
                onClick={() => setPrivacyOpen((open) => !open)}
                className="form-control flex h-10 items-center justify-between py-0 text-left text-[#8b8b8b]"
              >
                자세히 보기
                <Asset
                  src={assets['75:550'].imgChevronDown}
                  className={`transition-transform ${privacyOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {privacyOpen && (
                <p
                  id="privacy-details"
                  className="rounded-lg bg-[#f0f2f0] px-3 py-2 text-xs text-muted"
                >
                  웨이팅 등록과 호출 안내를 위해 학번, 전화번호 및 인원 수를 수집·이용합니다. 동의를
                  거부할 수 있으나 웨이팅 접수가 제한됩니다.
                </p>
              )}
              <label className="relative ml-auto flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-[#8b8b8b]">
                <input
                  required
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
                />
                <Asset
                  src={assets['75:550'].imgConsentCheck}
                  className="pointer-events-none opacity-60 transition-[filter,opacity] peer-checked:opacity-100 peer-checked:[filter:brightness(.65)_sepia(1)_saturate(7)_hue-rotate(95deg)]"
                />
                동의합니다
              </label>
            </div>
            {ticket && (
              <p role="status" className="text-sm text-danger">
                이미 대기 중인 부스가 있어요. 내 대기표를 확인해주세요.
              </p>
            )}
            <RequestState error={action.error} />
            {!ticket && booth.waitingStatus !== 'OPEN' && (
              <p role="status" className="text-sm text-danger">
                현재 접수하지 않는 부스입니다.
              </p>
            )}
          </form>
        </div>
        <div
          className="shrink-0 px-[19px] pt-4 pb-5"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <Button
            type="submit"
            form="waiting-registration-form"
            formNoValidate={!!ticket}
            disabled={action.pending || (!ticket && booth.waitingStatus !== 'OPEN')}
          >
            {ticket ? '내 대기표 보기' : '웨이팅 접수하기'}
          </Button>
        </div>
      </section>
    </Page>
  )
}
