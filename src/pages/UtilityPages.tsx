import { reportApi } from '../apis/report'
import { useResource } from '../hooks/useResource'
import { useFestival } from '../app/festival-context'
import { Link } from 'react-router-dom'
import { Page } from '../components/layout'
import { BackToList, Card, SectionTitle } from '../components/ui'
import { screens } from '../data/screens'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Page title={t('misc.notFoundTitle')}>
      <div className="page-pad">
        <Card className="p-6 text-center">
          <p className="text-[48px] font-bold text-brand">404</p>
          <p className="mt-3 text-sm">{t('misc.notFoundBody')}</p>
        </Card>
        <BackToList to="/">{t('misc.goHome')}</BackToList>
      </div>
    </Page>
  )
}
export function ErrorPage() {
  return (
    <div className="app-shell px-5 py-20 text-center">
      <h1 className="text-xl font-bold">{i18n.t('misc.errorTitle')}</h1>
      <p className="mt-3 text-sm">{i18n.t('misc.errorBody')}</p>
      <a href="/" className="primary-button green-gradient mt-6">
        {i18n.t('misc.backHome')}
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
  const { t } = useTranslation()
  return (
    <Page title={report ? '긴급 신고' : t('misc.guideTitle')} back="/menu">
      <div className="page-pad">
        <Card className="p-5">
          <h2 className="text-lg font-bold">
            {report ? '신고 안내 준비 중' : t('misc.guideHeading')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed">
            {report
              ? '운영진 연락처와 신고 기능은 준비 중입니다. 현재 화면에서는 신고가 접수되지 않습니다.'
              : t('misc.guideBody')}
          </p>
        </Card>
        <BackToList to={report ? '/map' : '/menu'}>
          {report ? '상황실 위치 확인하기' : t('misc.backToMenu')}
        </BackToList>
      </div>
    </Page>
  )
}
export function PreviewPage() {
  const reports = useResource(reportApi.mine)
  const { booths, performances, notices } = useFestival()
  const pathFor = (path: string) =>
    path
      .replace(':boothId', booths.find((b) => b.waitingEnabled)?.id || 'missing')
      .replace(':performanceId', performances[0]?.id || 'missing')
      .replace(':noticeId', notices[0]?.id || 'missing')
      .replace('/:reportId', reports.data?.[0] ? `/${reports.data[0].reportId}` : '')
  return (
    <Page title="KUFIM 화면 목록" back="/">
      <div className="page-pad">
        <Card className="p-4">
          <p className="text-sm leading-relaxed">
            실제 서버 데이터로 화면을 확인하는 목록입니다. 상세 링크는 등록된 항목을 사용하며,
            관리자 화면에는 로그인이 필요합니다.
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
                  <Link key={screen.node} to={pathFor(screen.path)} className="block px-4 py-3">
                    <h3 className="text-sm font-bold">{screen.name}</h3>
                    <p className="mt-1 break-all text-xs text-muted">{pathFor(screen.path)}</p>
                  </Link>
                ))}
            </Card>
          </section>
        ))}
      </div>
    </Page>
  )
}
