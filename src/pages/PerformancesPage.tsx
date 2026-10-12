import { useCallback } from 'react'
import { usePerformanceApi } from '../hooks/usePerformanceApi'
import { useResource } from '../hooks/useResource'
import { RequestState } from '../components/RequestState'
import { performanceView, festivalDays } from '../apis/adapters'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useFestival } from '../app/festival-context'
import { BottomActions, Page } from '../components/layout'
import { Card } from '../components/ui'
import { PerformanceFilters, ScheduleList } from '../components/festival'

export function PerformancesPage({ admin = false }: { admin?: boolean }) {
  const { performances, stages, festival } = useFestival()
  const [params, setParams] = useSearchParams()
  const day = params.get('day') || festivalDays(festival)[0] || performances[0]?.day || ''
  const stage = params.get('stage') || String(stages[0]?.stageId || '')
  const update = (key: string, value: string) =>
    setParams(
      (previous) => {
        previous.set(key, value)
        return previous
      },
      { replace: true },
    )
  return (
    <Page
      title={admin ? '무대 프로그램 관리' : '무대 공연 일정'}
      back={admin ? '/admin' : '/'}
      className={admin ? 'pb-28' : ''}
    >
      <PerformanceFilters
        day={day}
        stage={stage}
        onDay={(v) => update('day', v)}
        onStage={(v) => update('stage', v)}
      />
      <div className="px-5 pt-[18px]">
        <ScheduleList
          admin={admin}
          items={performances
            .filter((p) => p.day === day && p.stage === stage)
            .sort((a, b) => a.time.localeCompare(b.time))}
        />
      </div>
      {admin && (
        <BottomActions>
          <Link
            to={`/admin/performances/new?day=${day}&stage=${stage}`}
            className="primary-button green-gradient"
          >
            무대 프로그램 등록하기
          </Link>
        </BottomActions>
      )}
    </Page>
  )
}
export function PerformanceDetailPage() {
  const { id } = useParams()
  const { stages } = useFestival()
  const loader = useCallback(
    async () => performanceView((await usePerformanceApi.find(Number(id))).data.data, stages),
    [id, stages],
  )
  const resource = useResource(loader)
  const item = resource.data
  if (!item)
    return (
      <Page title="공연 상세" back="/performances">
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
      </Page>
    )
  return (
    <Page title="공연 상세" back="/performances">
      <div className="page-pad !gap-3 !pt-[22px]">
        <section className="green-gradient rounded-xl p-3.5 text-white shadow-card">
          <div className="mb-2 flex gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/45 px-2 py-px">{item.kind}</span>
            {item.status === 'now' && (
              <span className="rounded-full bg-[#ff5d5d] px-2 py-px">LIVE</span>
            )}
          </div>
          <h2 className="text-[22px] font-bold">{item.name}</h2>
          <p className="mt-2 text-sm font-bold">
            {item.place} {item.time}~{item.end}
          </p>
        </section>
        <Card className="p-4">
          <h2 className="font-bold">공연 소개</h2>
          <p className="mt-1.5 whitespace-pre-line text-xs">{item.description}</p>
        </Card>
        {item.additionalDescription && (
          <Card className="p-4">
            <h2 className="font-bold">공연 소개</h2>
            <p className="mt-1.5 whitespace-pre-line text-xs">{item.additionalDescription}</p>
          </Card>
        )}
        <Card className="p-4">
          <h2 className="font-bold">출연진</h2>
          <p className="mt-1.5 text-xs">{item.cast}</p>
        </Card>
        <Card className="p-4">
          <h2 className="font-bold">셋리스트</h2>
          <ol className="mt-1.5 list-decimal pl-5 text-xs">
            {item.setlist
              .split('\n')
              .filter(Boolean)
              .map((song, i) => (
                <li key={i}>{song}</li>
              ))}
          </ol>
        </Card>
      </div>
    </Page>
  )
}
