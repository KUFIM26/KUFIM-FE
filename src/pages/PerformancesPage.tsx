import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useDemo } from '../app/demo-context'
import { BottomActions, Page, StatusMessage } from '../components/layout'
import { isApiMode } from '../api/config'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import { toPerformance } from '../api/mappers'
import { useAsync } from '../api/useAsync'
import { Card } from '../components/ui'
import { PerformanceFilters, ScheduleList } from '../components/festival'
import { pickOption } from '../components/options'
import { NotFoundPage } from './UtilityPages'

export function PerformancesPage({ admin = false }: { admin?: boolean }) {
  const { performances, dayOptions, stageOptions } = useDemo()
  const [params, setParams] = useSearchParams()
  const day = pickOption(dayOptions, params.get('day'))
  const stage = pickOption(stageOptions, params.get('stage'))
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
  const { performances, dayOptions } = useDemo()
  // The list response omits the description, cast and setlist.
  const detail = useAsync(isApiMode ? () => api.performance(id!) : null, [id])
  const special = !isApiMode && (id === 'oxen' || id === 'dius')
  const base = isApiMode
    ? detail.data && toPerformance(detail.data, dayOptions)
    : (performances.find((p) => p.id === id) ?? (special ? performances[0] : undefined))
  if (isApiMode && detail.loading)
    return <StatusMessage>공연 정보를 불러오는 중이에요.</StatusMessage>
  if (
    isApiMode &&
    detail.error &&
    !(detail.error instanceof ApiError && detail.error.status === 404)
  )
    return <StatusMessage onRetry={detail.reload}>{detail.error.message}</StatusMessage>
  if (!base) return <NotFoundPage />
  const item = special
    ? {
        ...base,
        name: id === 'oxen' ? 'OXEN' : 'DIUS',
        kind: id === 'oxen' ? '밴드' : '댄스',
        status: 'now',
      }
    : base
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
            {item.stageName ?? (item.stage === 'main' ? '메인 스테이지' : '서브 스테이지')}{' '}
            {item.time}~{item.end}
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
