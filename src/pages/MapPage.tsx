import { Link, useSearchParams } from 'react-router-dom'
import { useFestival } from '../app/festival-context'
import { Page } from '../components/layout'
import { Asset, Chips, EmptyState, Tabs } from '../components/ui'
import { BoothRow, FacilityFilters, MapImage } from '../components/festival'
import { boothCategories } from '../data/models'
import { figmaAssets as assets } from '../data/figma-assets'

export default function MapPage() {
  const { booths, pins } = useFestival()
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
    <Page
      title="축제 지도"
      nav
      navAction={
        !list && (
          <button
            type="button"
            onClick={() => update('view', 'list')}
            className="flex items-center gap-2 whitespace-nowrap rounded-full bg-brand px-3 py-2 text-base leading-5 font-bold text-white"
          >
            <Asset src={assets['53:1227'].imgVector3} />
            리스트 보기
            <span className="flex h-5 items-center rounded-[10px] bg-white/30 px-1 text-xs">
              {items.length}
            </span>
          </button>
        )
      }
      className="!pb-0 overflow-hidden"
    >
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
      <div className="border-b border-[#d9d9d9] px-5 py-3.5">
        <Chips
          options={boothCategories}
          value={category}
          onChange={(v) => {
            setParams(
              (previous) => {
                previous.set('category', v)
                previous.delete('facility')
                return previous
              },
              { replace: true },
            )
          }}
        />
      </div>
      <FacilityFilters
        value={facility}
        onChange={(v) => {
          setParams(
            (previous) => {
              if (v) {
                previous.set('facility', v)
                previous.set('view', 'list')
              } else previous.delete('facility')
              return previous
            },
            { replace: true },
          )
        }}
      />
      <div className="relative min-h-[652px]" style={{ height: 'calc(100dvh - 246px)' }}>
        <MapImage
          markers={items.flatMap((b) => {
            const pin = pins.find(
              (p) =>
                p.targetId === b.apiId &&
                p.targetType === (b.period === 'facility' ? 'FACILITY' : 'BOOTH'),
            )
            return pin ? [{ ...b, position: { x: pin.xPercent, y: pin.yPercent } }] : []
          })}
          className="w-full"
        />
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
