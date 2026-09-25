import { Link } from 'react-router-dom'
import { Page } from '../components/layout'
import { BackToList, Card, SectionTitle } from '../components/ui'
import { screens } from '../data/screens'

export function NotFoundPage() {
  return (
    <Page title="페이지를 찾을 수 없어요">
      <div className="page-pad">
        <Card className="p-6 text-center">
          <p className="text-[48px] font-bold text-brand">404</p>
          <p className="mt-3 text-sm">주소를 확인하거나 홈으로 돌아가주세요.</p>
        </Card>
        <BackToList to="/">홈으로 가기</BackToList>
      </div>
    </Page>
  )
}
export function ErrorPage() {
  return (
    <div className="app-shell px-5 py-20 text-center">
      <h1 className="text-xl font-bold">화면을 불러오지 못했어요.</h1>
      <p className="mt-3 text-sm">잠시 후 다시 시도해주세요.</p>
      <a href="/" className="primary-button green-gradient mt-6">
        홈으로 돌아가기
      </a>
    </div>
  )
}
export function LoadingPage() {
  return (
    <main
      id="main-content"
      aria-label="KUFIM 로딩 화면"
      className="relative flex min-h-dvh items-center justify-center bg-white"
    >
      <h1 className="-translate-y-10 text-[60px] font-bold">KUFIM</h1>
      <p className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-[#b7b7b7]">
        © 2026. KUFIM. All rights reserved.
      </p>
      <Link to="/" className="absolute inset-0" aria-label="KUFIM 홈으로 이동" />
    </main>
  )
}
export function GuidePage({ report = false }: { report?: boolean }) {
  return (
    <Page title={report ? '긴급 신고' : '이용 안내'} back="/menu">
      <div className="page-pad">
        <Card className="p-5">
          <h2 className="text-lg font-bold">{report ? '신고 안내 준비 중' : 'KUFIM 이용 안내'}</h2>
          <p className="mt-3 text-sm leading-relaxed">
            {report
              ? '운영진 연락처와 신고 기능은 준비 중입니다. 현재 화면에서는 신고가 접수되지 않습니다.'
              : '축제 지도에서 부스를 찾고, 무대 일정과 공지사항을 확인하세요. 웨이팅은 부스 현장의 QR을 통해 접수할 수 있습니다.'}
          </p>
        </Card>
        <BackToList to={report ? '/map' : '/menu'}>
          {report ? '상황실 위치 확인하기' : '전체 메뉴로 돌아가기'}
        </BackToList>
      </div>
    </Page>
  )
}
export function PreviewPage() {
  return (
    <Page title="KUFIM 화면 목록" back="/">
      <div className="page-pad">
        <Card className="p-4">
          <p className="text-sm leading-relaxed">
            Figma의 31개 화면과 상태를 확인하는 목록입니다. 데이터는 데모이며 새로고침하면
            초기화됩니다.
          </p>
          <div className="mt-3 flex gap-2">
            <Link className="rounded-full bg-brand px-3 py-2 text-xs font-bold text-white" to="/">
              사용자 홈
            </Link>
            <Link className="rounded-full bg-[#eee] px-3 py-2 text-xs font-bold" to="/admin">
              관리자 메뉴
            </Link>
          </div>
        </Card>
        {['사용자', '웨이팅', '관리자', '부스 운영'].map((group) => (
          <section key={group} className="flex flex-col gap-2">
            <SectionTitle>{group}</SectionTitle>
            <Card className="divide-y divide-[#eee] overflow-hidden">
              {screens
                .filter((s) => s.group === group)
                .map((screen) => (
                  <Link key={screen.node} to={screen.path} className="block px-4 py-3">
                    <h3 className="text-sm font-bold">{screen.name}</h3>
                    <p className="mt-1 break-all text-xs text-muted">{screen.path}</p>
                  </Link>
                ))}
            </Card>
          </section>
        ))}
      </div>
    </Page>
  )
}
