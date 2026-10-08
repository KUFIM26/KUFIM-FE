import { Link } from 'react-router-dom'
import { Page } from '../components/layout'
import { Asset, Card, SectionTitle } from '../components/ui'
import { figmaAssets as assets } from '../data/figma-assets'
import { useDemo } from '../app/demo-context'
import { useAdminSession } from '../app/admin-session'
import { kst } from '../api/mappers'

const monthDay = (iso: string) => {
  const t = kst(iso)
  return `${String(t.month).padStart(2, '0')}월 ${String(t.day).padStart(2, '0')}일`
}

export default function MenuPage({ admin = false }: { admin?: boolean }) {
  const { festival } = useDemo()
  const { account, logout } = useAdminSession()
  const sections = [
    {
      title: '정보',
      items: admin
        ? [
            ['공지사항 등록', '/admin/notices'],
            ['무대 프로그램 관리', '/admin/performances'],
            ['부스 프로그램 관리', '/admin/booths'],
          ]
        : [
            ['공지사항', '/notices'],
            ['전체 프로그램', '/performances'],
            ['부스 목록', '/booths'],
          ],
    },
    {
      title: '서비스',
      items: [
        ['행사장 지도', '/map'],
        [admin ? 'QR 웨이팅 관리' : 'QR 웨이팅', admin ? '/admin/waiting' : '/waiting'],
        ['긴급 신고', '/report'],
      ],
    },
    { title: '기타', items: [['이용 안내', '/guide']] },
  ]
  return (
    <Page title={admin ? '관리자 메뉴' : '전체 메뉴'} plain nav={!admin}>
      <div className={`page-pad !pt-6 ${admin ? 'gap-5' : '!gap-3'}`}>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[#1c8944] text-xs font-bold text-white">
            <span>KU</span>
            <span>FIM</span>
          </div>
          <div>
            <p className="text-sm font-bold">
              {festival?.name ?? "2026 건국대학교 가을 대동제 ‘일감연'"}
            </p>
            <p className="mt-1 text-xs font-medium">
              {festival
                ? `${monthDay(festival.startAt)} ~ ${monthDay(festival.endAt)}`
                : '09월 30일 ~ 10월 02일'}
            </p>
          </div>
        </Card>
        {sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-2">
            <SectionTitle>{section.title}</SectionTitle>
            <Card className="overflow-hidden">
              {section.items.map(([label, to]) => (
                <Link
                  key={to}
                  to={to}
                  className="flex min-h-14 items-center justify-between border-b border-[#eee] px-4 py-4 text-base font-bold text-[#383838] last:border-0"
                >
                  {label}
                  <Asset src={assets['94:255'].imgFrame1597881180} />
                </Link>
              ))}
            </Card>
          </section>
        ))}
        {admin && account && (
          <section className="flex flex-col gap-2">
            <SectionTitle>계정</SectionTitle>
            <Card className="flex items-center justify-between gap-3 px-4 py-4">
              <div>
                <p className="text-base font-bold text-[#383838]">{account.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {account.role === 'SUPER_ADMIN' ? '총괄 관리자' : '부스 관리자'}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-sm font-bold text-danger underline"
              >
                로그아웃
              </button>
            </Card>
          </section>
        )}
      </div>
    </Page>
  )
}
