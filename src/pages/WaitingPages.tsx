import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDemo } from '../app/demo-context'
import { Page } from '../components/layout'
import { Asset, Button, Card, ConfirmDialog, SectionTitle } from '../components/ui'
import { BoothRow, WaitingNumbers } from '../components/festival'
import { figmaAssets as assets } from '../data/figma-assets'
import { NotFoundPage } from './UtilityPages'

export function WaitingInstructions() {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold">이용 방법</h2>
      <ol className="mt-1.5 list-decimal pl-[18px] text-xs">
        <li>지도에서 원하는 부스 위치 확인</li>
        <li>해당 부스로 직접 이동</li>
        <li>부스의 QR코드 스캔</li>
        <li>
          입장 순서가 되면 알림/문자 수신하여 입장
          <br />
          (호출 후 10분 안에 입장하지 않을 경우 자동 취소)
        </li>
      </ol>
    </Card>
  )
}
export function WaitingPage() {
  const { booths, ticket, setTicket } = useDemo()
  const [params, setParams] = useSearchParams()
  const preview = params.get('state') === 'active' || params.get('state') === 'cancel'
  const [cancelOpen, setCancelOpen] = useState(params.get('state') === 'cancel')
  const active =
    ticket ??
    (preview
      ? {
          boothId: 'booth-1',
          number: 88,
          people: 2,
          position: 2,
          minutes: 0,
          registered: '2026.09.12. 18:04',
        }
      : null)
  const close = () => {
    setCancelOpen(false)
    if (params.get('state') === 'cancel') setParams({ state: 'active' }, { replace: true })
  }
  return (
    <Page title="QR 웨이팅" nav>
      <div className="page-pad !gap-3">
        {active ? (
          <section className="flex flex-col gap-2">
            <SectionTitle>웨이팅 중인 부스</SectionTitle>
            <Card className="p-4">
              <h2 className="font-bold">웨이팅 순서</h2>
              <p className="mt-1.5 font-bold text-[#0b5225]">
                <span className="text-[32px]">{active.position}</span>번째
              </p>
              <p className="text-xs">
                웨이팅 번호 <strong>{active.number}번</strong>
                <span className="ml-4">
                  남은 시간 <strong>{String(active.minutes).padStart(2, '0')}분</strong>
                </span>
              </p>
              <p className="mt-1 text-xs">{active.registered} 등록</p>
            </Card>
          </section>
        ) : (
          <div className="flex h-[201px] flex-col items-center justify-center gap-[18px] rounded-xl bg-[#e8f5ee] p-3">
            <Asset src={assets['75:2'].imgGroup4} />
            <div className="text-center">
              <h2 className="text-lg font-bold">아직 신청한 웨이팅이 없어요.</h2>
              <p className="mt-2 text-xs">
                부스에 직접 방문해 현장 QR을 스캔하면
                <br />
                웨이팅을 등록할 수 있어요.
              </p>
            </div>
          </div>
        )}
        <WaitingInstructions />
        {active ? (
          <>
            <Button tone="red" onClick={() => setCancelOpen(true)}>
              웨이팅 취소하기
            </Button>
            <div className="primary-button bg-[#bcbcbc]" aria-disabled="true">
              한 번에 한 개의 부스만 웨이팅 가능
            </div>
          </>
        ) : (
          <Link className="primary-button green-gradient" to="/waiting/scan">
            <Asset src={assets['75:2'].imgVector1} />
            부스 QR 스캔하기
          </Link>
        )}
        <section className="flex flex-col gap-2">
          <SectionTitle>현재 가장 인기있는 부스 TOP3</SectionTitle>
          {booths
            .filter((b) => b.period === 'day')
            .slice(0, 3)
            .map((booth) => (
              <Card key={booth.id} className="px-4">
                <BoothRow booth={booth} description />
              </Card>
            ))}
        </section>
      </div>
      <ConfirmDialog
        open={cancelOpen}
        title="웨이팅 취소하기"
        onClose={close}
        onConfirm={() => {
          setTicket(null)
          setCancelOpen(false)
          setParams({}, { replace: true })
        }}
      >
        정말 {booths.find((b) => b.id === active?.boothId)?.name || '해당 부스'}의<br />
        웨이팅을 취소하시겠습니까?
      </ConfirmDialog>
    </Page>
  )
}
function ScannerBackground() {
  return (
    <div className="relative min-h-[calc(100dvh-68px)] rounded-t-xl bg-black text-white">
      <div className="absolute top-[233px] left-1/2 w-[258px] -translate-x-1/2">
        <Link
          to="/waiting/register/booth-1"
          aria-label="QR 접수 화면 미리보기"
          className="block aspect-square border-4 border-white"
        />
        <p className="mt-5 whitespace-nowrap text-center text-sm font-bold">
          QR 코드를 사각형 내부에 정확히 인식해주세요.
        </p>
      </div>
    </div>
  )
}
export function ScanPage() {
  return (
    <Page title="QR 웨이팅" back="/waiting" className="!bg-black">
      <ScannerBackground />
      <div className="absolute inset-x-5 bottom-5 flex flex-col gap-3">
        <Link
          to="/waiting/register/booth-1"
          className="text-center text-xs text-white/70 underline"
        >
          접수 화면 미리보기 · 카메라 연동 준비 중
        </Link>
        <Link to="/waiting" className="primary-button bg-[#bcbcbc] !text-[#2a2a2a]">
          돌아가기
        </Link>
      </div>
    </Page>
  )
}
export function WaitingRegisterPage() {
  const { boothId } = useParams()
  const { booths, ticket, setTicket } = useDemo()
  const navigate = useNavigate()
  const sheetRef = useRef<HTMLElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [student, setStudent] = useState('')
  const [phone, setPhone] = useState('')
  const [people, setPeople] = useState('')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  useEffect(() => {
    const sheet = sheetRef.current
    const form = formRef.current
    if (!sheet || !form) return

    const viewport = window.visualViewport
    let fullHeight = viewport?.height ?? window.innerHeight
    let originalScrollY: number | null = null
    let keyboardOpen = false
    let frame = 0
    let restoreFrame = 0
    const focusedField = () => {
      const element = document.activeElement
      return element instanceof HTMLElement &&
        form.contains(element) &&
        element.matches('input:not([type="checkbox"]), select')
        ? element
        : null
    }
    const updateViewport = () => {
      const keyboardHeight = Math.max(0, fullHeight - (viewport?.height ?? window.innerHeight))
      const field = focusedField()
      cancelAnimationFrame(frame)

      if (keyboardHeight > 120 && (field || keyboardOpen)) {
        cancelAnimationFrame(restoreFrame)
        keyboardOpen = true
        sheet.style.paddingBottom = `${Math.ceil(keyboardHeight) + 20}px`
        frame = requestAnimationFrame(() => {
          const active = focusedField()
          if (!active) return
          const rect = active.getBoundingClientRect()
          const top = (viewport?.offsetTop ?? 0) + 16
          const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 20
          if (rect.bottom > bottom) window.scrollBy(0, rect.bottom - bottom)
          else if (rect.top < top) window.scrollBy(0, rect.top - top)
        })
      } else if (keyboardOpen) {
        keyboardOpen = false
        field?.blur()
        sheet.style.paddingBottom = ''
        const scrollY = originalScrollY ?? 0
        restoreFrame = requestAnimationFrame(() => window.scrollTo(0, scrollY))
        originalScrollY = null
        fullHeight = viewport?.height ?? window.innerHeight
      } else if (!field) {
        fullHeight = viewport?.height ?? window.innerHeight
      }
    }
    const onFocus = () => {
      if (focusedField() && originalScrollY === null) originalScrollY = window.scrollY
      requestAnimationFrame(updateViewport)
    }
    const onBlur = () => {
      requestAnimationFrame(() => {
        if (!focusedField() && !keyboardOpen) originalScrollY = null
      })
    }

    form.addEventListener('focusin', onFocus)
    form.addEventListener('focusout', onBlur)
    viewport?.addEventListener('resize', updateViewport)
    viewport?.addEventListener('scroll', updateViewport)
    window.addEventListener('resize', updateViewport)
    return () => {
      form.removeEventListener('focusin', onFocus)
      form.removeEventListener('focusout', onBlur)
      viewport?.removeEventListener('resize', updateViewport)
      viewport?.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
      cancelAnimationFrame(frame)
      cancelAnimationFrame(restoreFrame)
      sheet.style.paddingBottom = ''
    }
  }, [])
  const booth = booths.find((b) => b.id === boothId && b.period !== 'facility')
  if (!booth) return <NotFoundPage />
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (ticket) {
      navigate('/waiting')
      return
    }
    // Personal information is only validated locally in this prototype and is not stored.
    setTicket({
      boothId: booth.id,
      number: 88,
      people: Number(people),
      position: 2,
      minutes: 0,
      registered: '2026.09.30. 18:04',
    })
    navigate('/waiting', { replace: true })
  }
  return (
    <Page title="QR 웨이팅" back="/waiting/scan" className="!bg-black">
      <ScannerBackground />
      <section
        ref={sheetRef}
        className="registration-sheet absolute inset-x-0 top-[215px] min-h-[827px] rounded-t-xl bg-canvas px-[19px] pt-2 pb-5 shadow-[0_-2px_2px_rgba(0,0,0,.2)]"
        aria-label="웨이팅 접수"
      >
        <div className="mx-auto mb-4 h-[3px] w-[51px] rounded bg-[#c2c2c2]" />
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
          <p className="mt-1.5 text-xs">부스를 만나보세요!</p>
        </Card>
        <form ref={formRef} className="mt-5 flex flex-col gap-5" onSubmit={submit}>
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
              <p id="privacy-details" className="rounded-lg bg-[#f0f2f0] px-3 py-2 text-xs text-muted">
                웨이팅 등록과 호출 안내를 위해 학번, 전화번호 및 인원 수를 수집·이용합니다.
                동의를 거부할 수 있으나 웨이팅 접수가 제한됩니다.
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
          <Button type="submit">
            {ticket ? '내 대기표 보기' : '웨이팅 접수하기'}
          </Button>
        </form>
      </section>
    </Page>
  )
}
