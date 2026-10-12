import { seoulDate } from '../apis/adapters'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFestival } from '../app/festival-context'
import { Page } from '../components/layout'
import { Asset, SectionTitle } from '../components/ui'
import { EmergencyBanner, FestivalMeta, ScheduleList, Stats } from '../components/festival'
import { figmaAssets as assets } from '../data/figma-assets'

export default function HomePage() {
  const [showNotice, setShowNotice] = useState(true)
  const { performances, notices, festival } = useFestival()
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
              { label: '현재 운영 부스', value: `${festival?.summary.operatingBoothCount ?? 0}개` },
              { label: '오늘의 공연', value: `${festival?.summary.todayPerformanceCount ?? 0}건` },
              {
                label: '무대 입장 현황',
                value: !festival?.summary.stageEntrySummary.length
                  ? '정보 없음'
                  : festival.summary.stageEntrySummary.some((s) => s.entryStatus === 'RESTRICTED')
                    ? '일부 제한'
                    : '입장 가능',
              },
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
          <ScheduleList items={performances.filter((p) => p.status === 'now')} />
        </section>
        <section className="flex flex-col gap-2">
          <SectionTitle>오늘의 무대</SectionTitle>
          <ScheduleList
            items={performances.filter(
              (p) => p.date === seoulDate(festival?.serverTime || new Date().toISOString()),
            )}
          />
        </section>
      </div>
    </Page>
  )
}
