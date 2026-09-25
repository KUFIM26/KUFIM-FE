import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDemo } from '../app/demo-context'
import { Page } from '../components/layout'
import { Asset, SectionTitle } from '../components/ui'
import { EmergencyBanner, FestivalMeta, ScheduleList, Stats } from '../components/festival'
import { figmaAssets as assets } from '../data/figma-assets'

export default function HomePage() {
  const [showNotice, setShowNotice] = useState(true)
  const { performances, notices } = useDemo()
  const a = assets['17:303']
  const shortcuts = [
    { to: '/map', label: '축제 지도', icon: a.imgVector3 },
    { to: '/waiting', label: 'QR 웨이팅', icon: a.imgGroup },
    { to: '/notices', label: '공지사항', icon: a.imgGroup1 },
    { to: '/performances', label: '무대 일정', icon: a.imgGroup3 },
  ]
  return (
    <Page title="홈" home nav>
      <div className="page-pad !pt-5.5">
        {showNotice && (
          <EmergencyBanner
            notice={notices.find((n) => n.category === '긴급')}
            dismiss={() => setShowNotice(false)}
          />
        )}
        <section className="green-gradient flex flex-col gap-2 rounded-xl p-3.5 shadow-card">
          <FestivalMeta />
          <h2 className="text-base font-bold text-white">축제 분위기를 만끽하세요!</h2>
          <Stats
            items={[
              { label: '현재 운영 부스', value: '65개' },
              { label: '오늘의 공연', value: '5건' },
              { label: '무대 입장 현황', value: '보통' },
            ]}
          />
        </section>
        <div className="grid grid-cols-4 gap-4 max-[360px]:gap-2">
          {shortcuts.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="card flex h-18 min-w-0 flex-col items-center justify-center gap-2 shadow-nav"
            >
              <span className="flex h-5.5 items-center">
                <Asset src={link.icon} />
              </span>
              <span className="whitespace-nowrap text-xs font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
        <section className="flex flex-col gap-2">
          <SectionTitle>현재 진행 중인 프로그램</SectionTitle>
          {[
            {
              name: 'OXEN',
              place: '노천극장',
              time: '10:00~17:00',
              body: '건국대학교 유일 정책동아리 옥슨의 무대입니다.',
              arrow: a.imgVector5,
            },
            {
              name: 'DIUS',
              place: '황소상 서브무대',
              time: '13:00~16:00',
              body: '공과대학 댄스동아리 DIUS의 무대입니다.',
              arrow: a.imgVector6,
            },
          ].map((item, i) => (
            <Link
              to={`/performances/${i ? 'dius' : 'oxen'}`}
              className="card flex items-center justify-between gap-3 p-4"
              key={item.name}
            >
              <div>
                <h3 className="text-base font-bold">{item.name}</h3>
                <p className="mt-1.5 text-xs font-medium">
                  {item.place}
                  <span className="mx-1.5">|</span>
                  {item.time}
                </p>
                <p className="mt-1.5 text-xs">{item.body}</p>
              </div>
              <Asset src={item.arrow} />
            </Link>
          ))}
        </section>
        <section className="flex flex-col gap-2">
          <SectionTitle>오늘의 무대</SectionTitle>
          <ScheduleList items={performances.filter((p) => p.day === '1' && p.stage === 'main')} />
        </section>
      </div>
    </Page>
  )
}
