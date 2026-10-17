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
    <Page title={admin ? '관리자 메뉴' : '전체 메뉴'} plain nav={!admin}>
      <div className={`page-pad !pt-6 ${admin ? 'gap-5' : '!gap-3'}`}>
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
        {admin && (
          <>
            <p className="text-sm items-center">{auth.account?.name}님</p>
            <button
              className="text-sm text-brand underline"
              disabled={action.pending}
              onClick={() => void action.run(auth.logout)}
            >
              로그아웃
            </button>
            <RequestState error={action.error} />
          </>
        )}
      </div>
    </Page>
  )
}
