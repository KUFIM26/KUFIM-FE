import { useFestival } from '../app/festival-context'
import { useAuth } from '../app/auth-context'
import { useAction } from '../hooks/useResource'
import { RequestState } from '../components/RequestState'
import { seoulDate } from '../apis/adapters'
import { Link } from 'react-router-dom'
import { Page } from '../components/layout'
import { Asset, Card, SectionTitle } from '../components/ui'
import { figmaAssets as assets } from '../data/figma-assets'

const festivalDate = (value: string) => {
  const date = seoulDate(value)
  return `${date.slice(5, 7)}월 ${date.slice(8, 10)}일`
}

export default function MenuPage({ admin = false }: { admin?: boolean }) {
  const { festival } = useFestival()
  const auth = useAuth()
  const action = useAction()
  const sections = [
    {
      title: '정보',
      items: admin
        ? auth.account?.role === 'BOOTH_ADMIN'
          ? []
          : [
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
        ...(admin && auth.account?.role === 'SUPER_ADMIN'
          ? [['혼잡도 관리', '/admin/congestion']]
          : []),
        ['긴급 신고', '/report'],
      ],
    },
    { title: '기타', items: [['이용 안내', '/guide']] },
  ]
  return (
    <Page title={admin ? '관리자 메뉴' : '전체 메뉴'} plain nav>
      <div className={`page-pad !pt-6 ${admin ? 'gap-5' : '!gap-3'}`}>
        {admin && (
          <Card className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8e8e8]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#9a9a9a" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5v1H4Z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold">{auth.account?.name || '관리자'} 님</p>
              <p className="mt-1 text-xs font-medium text-[#6b6b6b]">안녕하세요.</p>
            </div>
            <button
              className="ml-auto shrink-0 rounded-full bg-[#1d8a45] px-3.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              disabled={action.pending}
              onClick={() => void action.run(auth.logout)}
            >
              로그아웃
            </button>
          </Card>
        )}
        {admin && <RequestState error={action.error} />}
        <Card className="flex items-center gap-3 p-4">
          <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[#1c8944] text-xs font-bold text-white">
            <span>KU</span>
            <span>FIM</span>
          </div>
          <div>
            <p className="text-sm font-bold">{festival?.name || '축제 정보 준비 중'}</p>
            <p className="mt-1.5 text-xs font-medium">
              {festival
                ? `${festivalDate(festival.startAt)} ~ ${festivalDate(festival.endAt)}`
                : ''}
            </p>
          </div>
        </Card>

        {sections
          .filter((section) => section.items.length)
          .map((section) => (
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
      </div>
    </Page>
  )
}
