import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useDemo } from '../app/demo-context'
import { BottomActions, Page } from '../components/layout'
import { BoothRow, FacilityFilters, MapImage, WaitingNumbers } from '../components/festival'
import { Card, Chips, EmptyState, Tabs } from '../components/ui'
import { boothCategories } from '../data/mock'
import { NotFoundPage } from './UtilityPages'
import { useLiveBooth } from '../api/useLiveBooth'

export function BoothsPage({ admin = false }: { admin?: boolean }) {
  const { booths } = useDemo()
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
      title={admin ? '부스 프로그램 관리' : '부스 프로그램 목록'}
      back={admin ? '/admin' : '/menu'}
      className={admin ? 'pb-28' : ''}
    >
      <div className="px-5 pt-3">
        <Tabs
          value={period}
          onChange={updatePeriod}
          options={[
            { value: 'day', label: '주간' },
            { value: 'night', label: '야간' },
            { value: 'facility', label: '시설' },
          ]}
        />
      </div>
      {period === 'facility' ? (
        <FacilityFilters value={category} onChange={updateCategory} />
      ) : (
        <div className="px-5 py-3.5">
          <Chips options={boothCategories} value={category} onChange={updateCategory} />
        </div>
      )}
      <section className="min-h-[calc(100dvh-178px)] rounded-t-xl border-t-2 border-[#d9d9d9] bg-white px-5 pt-4">
        <h2 className="text-base font-bold text-muted">
          총 {items.length}개{period !== 'facility' && ' 부스'}
        </h2>
        <div className="mt-1 divide-y divide-[#d9d9d9]">
          {items.length ? (
            items.map((booth) => <BoothRow key={booth.id} booth={booth} admin={admin} />)
          ) : (
            <EmptyState>해당하는 {period === 'facility' ? '시설이' : '부스가'} 없어요.</EmptyState>
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
  const { booths } = useDemo()
  const listed = booths.find((b) => b.id === id)
  const { booth } = useLiveBooth(listed)
  if (!booth) return <NotFoundPage />
  return (
    <Page title={booth.period === 'facility' ? '시설 안내' : '부스 안내'} back="/booths">
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
          <h2 className="font-bold">{booth.period === 'facility' ? '시설' : '부스'} 소개</h2>
          <p className="mt-2 text-xs">{booth.description}</p>
        </Card>
        <Link to="/map" aria-label="축제 지도에서 위치 보기">
          <MapImage variant="mini" className="h-50 rounded-xl" />
        </Link>
        {booth.period !== 'facility' && (
          <>
            <p className="text-center text-sm text-muted">
              부스에 직접 방문해 현장 QR을 스캔해주세요.
            </p>
            <Link to="/waiting/scan" className="primary-button green-gradient">
              부스 QR 스캔하기
            </Link>
          </>
        )}
      </div>
    </Page>
  )
}
