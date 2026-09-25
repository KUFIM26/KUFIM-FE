import { Link, useSearchParams } from 'react-router-dom'
import { useDemo } from '../app/demo-context'
import { Page } from '../components/layout'
import { Asset, Chips, EmptyState, Tabs } from '../components/ui'
import { BoothRow, FacilityFilters, MapImage } from '../components/festival'
import { boothCategories } from '../data/mock'
import { figmaAssets as assets } from '../data/figma-assets'

export default function MapPage() {
  const { booths } = useDemo()
  const [params, setParams] = useSearchParams()
  const period = params.get('period') === 'night' ? 'night' : 'day'
  const category = params.get('category') || '전체'
  const facility = params.get('facility') || ''
  const list = params.get('view') === 'list'
  const update = (key: string, value: string) =>
    setParams(
      (previous) => {
        if (value) previous.set(key, value)
        else previous.delete(key)
        return previous
      },
      { replace: true },
    )
  const items = booths.filter((b) =>
    facility
      ? b.period === 'facility' && b.category === facility
      : b.period === period && (category === '전체' || b.category === category),
  )
  return (
    <Page title="축제 지도" nav className="!pb-0 overflow-hidden">
      <div className="px-5 pt-3">
        <Tabs
          value={period}
          onChange={(v) => update('period', v)}
          options={[
            { value: 'day', label: '주간' },
            { value: 'night', label: '야간' },
          ]}
        />
      </div>
      <div className="border-b border-[#d9d9d9] px-5 pt-3 pb-[11px]">
        <Chips
          compact
          options={boothCategories.map((c) => (c === '학교본부' ? '학교 본부' : c))}
          value={category === '학교본부' ? '학교 본부' : category}
          onChange={(v) => {
            update('category', v.replace('학교 본부', '학교본부'))
            update('facility', '')
          }}
        />
      </div>
      <FacilityFilters
        value={facility}
        onChange={(v) => {
          update('facility', v)
          if (v) update('view', 'list')
        }}
      />
      <div className="relative min-h-[652px]" style={{ height: 'calc(100dvh - 246px)' }}>
        <MapImage className="absolute inset-0" />
        {!list && (
          <button
            type="button"
            onClick={() => update('view', 'list')}
            className="absolute bottom-[91px] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-brand px-3 py-2 text-base font-bold text-white"
          >
            <Asset src={assets['53:1227'].imgVector3} />
            리스트 보기
            <span className="rounded-full bg-white/25 px-1.5 text-xs">{items.length}</span>
          </button>
        )}
        {list && (
          <section
            aria-label="지도 부스 목록"
            className="absolute inset-x-0 top-[184px] bottom-0 overflow-y-auto rounded-t-xl border-t-2 border-[#d0d0d0] bg-white px-5 pb-24"
          >
            <button
              type="button"
              aria-label="리스트 닫고 지도 보기"
              onClick={() => update('view', '')}
              className="mx-auto flex h-6 w-20 items-center justify-center"
            >
              <span className="h-[3px] w-[51px] rounded bg-[#c2c2c2]" />
            </button>
            <div className="divide-y divide-[#d9d9d9]">
              {items.length ? (
                items.map((b) => <BoothRow key={b.id} booth={b} />)
              ) : (
                <EmptyState>해당 위치에 표시할 항목이 없어요.</EmptyState>
              )}
            </div>
            <Link to="/booths" className="mt-5 block text-center text-xs text-brand underline">
              전체 부스 목록
            </Link>
          </section>
        )}
      </div>
    </Page>
  )
}
