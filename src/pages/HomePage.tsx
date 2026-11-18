import { seoulDate } from '../apis/adapters'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFestival } from '../app/festival-context'
import { Page } from '../components/layout'
import { Asset, EmptyState, SectionTitle } from '../components/ui'
import { EmergencyBanner, FestivalMeta, ScheduleList, Stats } from '../components/festival'
import { figmaAssets as assets } from '../data/figma-assets'
import { useFestivalApi } from '../hooks/useFestivalApi'
import { useResource } from '../hooks/useResource'
import { pollEvery, useRealtimeConnected, useTopic } from '../apis/realtime'
import { RequestState } from '../components/RequestState'
import { useTranslation } from 'react-i18next'

export default function HomePage() {
  const [showNotice, setShowNotice] = useState(true)
  const { t } = useTranslation()
  const { performances, notices, festival, stages } = useFestival()
  const stageLoader = useCallback(async () => (await useFestivalApi.stages()).data.data, [])
  const live = useRealtimeConnected()
  const stageResource = useResource(stageLoader, pollEvery(live, 15000))
  useTopic('/topic/congestion', stageResource.refresh)
  const primaryStage = [...(stageResource.data ?? stages)].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  )[0]
  const primaryZone = [...(primaryStage?.zones ?? [])].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  )[0]
  const a = assets['17:303']
  const currentPerformances = performances.filter((performance) => performance.status === 'now')
  const primaryStageId = primaryStage?.stageId
  const today = seoulDate(festival?.serverTime || new Date().toISOString())
  const shortcuts = [
    { to: '/map', label: t('home.shortcutMap'), icon: a.imgVector3 },
    { to: '/waiting', label: t('home.shortcutWaiting'), icon: a.imgGroup },
    { to: '/notices', label: t('home.shortcutNotices'), icon: a.imgGroup1 },
    { to: '/performances', label: t('home.shortcutShows'), icon: a.imgGroup3 },
  ]
  return (
    <Page title={t('home.title')} home nav>
      <div className="page-pad !pt-5.5">
        {showNotice && (
          <EmergencyBanner
            notice={notices.find((n) => n.category === '긴급')}
            dismiss={() => setShowNotice(false)}
          />
        )}
        <section className="green-gradient flex flex-col gap-2 rounded-xl p-3.5 shadow-card">
          <FestivalMeta />
          <h2 className="text-base font-bold text-white">{t('home.slogan')}</h2>
          <Stats
            items={[
              {
                label: t('home.openBooths'),
                value: t('home.boothCount', { count: festival?.summary.operatingBoothCount ?? 0 }),
              },
              {
                label: t('home.todayShows'),
                value: t('home.showCount', { count: festival?.summary.todayPerformanceCount ?? 0 }),
              },
              {
                label: t('home.stageCrowd'),
                value: primaryZone?.level ? t(`congestion.${primaryZone.level}`) : t('home.noInfo'),
              },
            ]}
          />
        </section>
        <RequestState error={stageResource.error} retry={() => void stageResource.refresh()} />
        <div className="grid grid-cols-4 gap-4 max-[360px]:gap-2">
          {shortcuts.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="card flex h-18 min-w-0 flex-col items-center justify-center gap-2 shadow-card"
            >
              <span className="flex h-5.5 items-center">
                <Asset src={link.icon} />
              </span>
              <span className="whitespace-nowrap text-xs font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
        <section className="flex flex-col gap-2">
          <SectionTitle>{t('home.nowPlaying')}</SectionTitle>
          {currentPerformances.length ? (
            currentPerformances.map((item, index) => (
              <Link
                to={`/performances/${item.id}`}
                className="card flex items-center justify-between gap-3 p-4"
                key={item.id}
              >
                <div>
                  <h3 className="text-base font-bold">{item.name}</h3>
                  <p className="mt-1.5 text-xs font-medium">
                    {item.place}
                    <span className="mx-1.5">|</span>
                    {item.time}~{item.end}
                  </p>
                  {item.description && <p className="mt-1.5 text-xs">{item.description}</p>}
                </div>
                <Asset src={index % 2 ? a.imgVector6 : a.imgVector5} />
              </Link>
            ))
          ) : (
            <EmptyState>{t('home.nothingNow')}</EmptyState>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <SectionTitle>{t('home.todayStage')}</SectionTitle>
          <ScheduleList
            items={performances.filter(
              (p) =>
                p.date === today &&
                (primaryStageId === undefined || p.stage === String(primaryStageId)),
            )}
          />
        </section>
      </div>
    </Page>
  )
}
