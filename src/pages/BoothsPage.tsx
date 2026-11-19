import { useCallback } from 'react'
import { useBoothApi } from '../hooks/useBoothApi'
import { useFacilityApi } from '../hooks/useFacilityApi'
import { pollEvery, useRealtimeConnected, useTopic } from '../apis/realtime'
import { useResource } from '../hooks/useResource'
import { RequestState } from '../components/RequestState'
import { boothView, facilityView } from '../apis/adapters'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useFestival } from '../app/festival-context'
import { BottomActions, Page } from '../components/layout'
import { BoothRow, FacilityFilters, MapImage, WaitingNumbers } from '../components/festival'
import { Card, Chips, EmptyState, Tabs } from '../components/ui'
import { boothCategories } from '../data/models'
import { useTranslation } from 'react-i18next'
import { useLabel } from '../i18n/label'

export function BoothsPage({ admin = false }: { admin?: boolean }) {
  const { booths } = useFestival()
  const { t } = useTranslation()
  const label = useLabel()
  const [params, setParams] = useSearchParams()
  const period = ['night', 'facility'].includes(params.get('period') || '')
    ? params.get('period')!
    : 'day'
  const category = params.get('category') || (period === 'facility' ? '' : '전체')
  const updatePeriod = (value: string) => setParams({ period: value }, { replace: true })
  const updateCategory = (value: string) =>
    setParams({ period, category: value }, { replace: true })
  const items = booths.filter(
    (b) => b.period === period && (!category || category === '전체' || b.category === category),
  )
  return (
    <Page
      title={admin ? '부스 프로그램 관리' : t('booths.title')}
      back={admin ? '/admin' : '/menu'}
      className={admin ? 'pb-28' : ''}
    >
      <div className="px-5 pt-3">
        <Tabs
          value={period}
          onChange={updatePeriod}
          options={[
            { value: 'day', label: t('booths.day') },
            { value: 'night', label: t('booths.night') },
            { value: 'facility', label: t('booths.facility') },
          ]}
        />
      </div>
      {period === 'facility' ? (
        <FacilityFilters value={category} onChange={updateCategory} />
      ) : (
        <div className="px-5 py-3.5">
          <Chips
            options={boothCategories}
            value={category}
            onChange={updateCategory}
            format={label}
          />
        </div>
      )}
      <section className="min-h-[calc(100dvh-178px)] rounded-t-xl border-t-2 border-[#d9d9d9] bg-white px-5 pt-4">
        <h2 className="text-base font-bold text-muted">
          {t(period === 'facility' ? 'booths.totalFacilities' : 'booths.totalBooths', {
            n: items.length,
          })}
        </h2>
        <div className="mt-1 divide-y divide-[#d9d9d9]">
          {items.length ? (
            items.map((booth) => <BoothRow key={booth.id} booth={booth} admin={admin} />)
          ) : (
            <EmptyState>
              {t(period === 'facility' ? 'booths.noFacilities' : 'booths.noBooths')}
            </EmptyState>
          )}
        </div>
      </section>
      {admin && (
        <BottomActions>
          <Link to={`/admin/booths/new?period=${period}`} className="primary-button green-gradient">
            부스 프로그램 등록하기
          </Link>
        </BottomActions>
      )}
    </Page>
  )
}
export function BoothDetailPage() {
  const { id } = useParams()
  const loader = useCallback(async () => {
    if (id?.startsWith('facility-'))
      return facilityView((await useFacilityApi.find(Number(id.slice(9)))).data.data)
    const [b, status] = await Promise.all([
      useBoothApi.find(Number(id)),
      useBoothApi.status(Number(id)),
    ])
    return {
      ...boothView(b.data.data),
      ...(status.data.data.waitingEnabled
        ? {
            teams: status.data.data.waitingTeamCount,
            minutes: status.data.data.estimatedWaitMinutes,
          }
        : {}),
    }
  }, [id])
  const connected = useRealtimeConnected()
  const facility = id?.startsWith('facility-')
  const resource = useResource(loader, facility ? 0 : pollEvery(connected, 15000))
  useTopic(id && !facility ? `/topic/booth/${id}/waiting` : null, resource.refresh)
  const { t } = useTranslation()
  const booth = resource.data
  if (!booth)
    return (
      <Page title={t('booths.boothGuide')} back="/booths">
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
      </Page>
    )
  return (
    <Page
      title={t(booth.period === 'facility' ? 'booths.facilityGuide' : 'booths.boothGuide')}
      back="/booths"
    >
      <div className="page-pad">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <h2 className="text-lg font-bold">{booth.name}</h2>
            <p className="mt-2 text-sm">
              {booth.place} | {booth.hours}
            </p>
          </div>
          <WaitingNumbers booth={booth} />
        </div>
        <Card className="p-4">
          <h2 className="font-bold">
            {t(booth.period === 'facility' ? 'booths.aboutFacility' : 'booths.aboutBooth')}
          </h2>
          <p className="mt-2 text-xs">{booth.description}</p>
        </Card>
        <Link to="/map" aria-label={t('booths.viewOnMap')} className="block">
          <MapImage variant="mini" className="h-[260px] rounded-xl" focus={booth.position} />
        </Link>
        {booth.waitingEnabled && (
          <>
            <p className="text-center text-sm text-muted">{t('booths.visitToScan')}</p>
            <Link to="/waiting/scan" className="primary-button green-gradient">
              {t('booths.scan')}
            </Link>
          </>
        )}
      </div>
    </Page>
  )
}
