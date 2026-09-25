import { useState } from 'react'
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
      ? { boothId: 'booth-1', number: 88, position: 2, minutes: 0, registered: '2026.09.12. 18:04' }
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
  const [student, setStudent] = useState('')
  const [phone, setPhone] = useState('')
  const booth = booths.find((b) => b.id === boothId && b.period !== 'facility')
  if (!booth) return <NotFoundPage />
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (ticket) {
      navigate('/waiting')
      return
    }
    // Inputs are only validated locally. Personal information is not saved or sent.
    setTicket({
      boothId: booth.id,
      number: 88,
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
        className="registration-sheet absolute inset-x-0 top-[377px] min-h-[453px] rounded-t-xl bg-canvas px-[19px] pt-2 pb-5"
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
        <form className="mt-5 flex flex-col gap-5" onSubmit={submit}>
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
          {ticket && (
            <p role="status" className="text-sm text-danger">
              이미 대기 중인 부스가 있어요. 내 대기표를 확인해주세요.
            </p>
          )}
          <Button type="submit" className="mt-[38px]">
            {ticket ? '내 대기표 보기' : '웨이팅 접수하기'}
          </Button>
        </form>
      </section>
    </Page>
  )
}
