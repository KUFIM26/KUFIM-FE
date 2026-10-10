import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { boothSeed, noticeSeed, performanceSeed, queueSeed } from '../data/mock'
import type { Booth, Notice, Performance } from '../data/mock'
import { DemoContext } from './demo-context'
import type { LoadState, Settings, Ticket } from './demo-context'
import type { Option } from '../components/ui'
import { isApiMode } from '../api/config'
import { pollEvery, useRealtimeConnected, useTopic } from '../api/realtime'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { ApiFestival, ApiStage, ApiZone } from '../api/types'
import {
  toBooth,
  toDayOptions,
  toFacility,
  toNotice,
  toPerformance,
  toStageOptions,
} from '../api/mappers'

const mockDays: Option[] = [
  { value: '1', label: 'DAY 1', sublabel: '9월 30일 (수)' },
  { value: '2', label: 'DAY 2', sublabel: '10월 01일 (목)' },
]
const mockStages: Option[] = [
  { value: 'main', label: '메인 무대' },
  { value: 'sub', label: '서브 무대' },
]
// A fresh database has no festival yet; the rest of the catalog still loads.
const optional = <T,>(promise: Promise<T>) =>
  promise.catch((error) => {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  })

async function fetchCatalog() {
  const [festival, booths, facilities, stages, performances, notices] = await Promise.all([
    optional(api.festival()),
    api.booths(),
    api.facilities(),
    api.stages(),
    api.performances(),
    api.notices(),
  ])
  return { festival, booths, facilities, stages, performances, notices }
}
type Catalog = Awaited<ReturnType<typeof fetchCatalog>>

export function DemoProvider({ children }: { children: ReactNode }) {
  const [booths, setBooths] = useState<Booth[]>(isApiMode ? [] : boothSeed)
  const [notices, setNotices] = useState<Notice[]>(isApiMode ? [] : noticeSeed)
  const [performances, setPerformances] = useState<Performance[]>(isApiMode ? [] : performanceSeed)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [queue, setQueue] = useState(queueSeed)
  const [settings, setSettings] = useState<Record<string, Settings>>({
    'booth-1': { status: '운영 중', minutes: 50, cancelMinutes: 10 },
  })
  const [load, setLoad] = useState<LoadState>({ status: isApiMode ? 'loading' : 'ready' })
  const [festival, setFestival] = useState<ApiFestival | null>(null)
  const [dayOptions, setDayOptions] = useState(mockDays)
  const [stageOptions, setStageOptions] = useState(mockStages)
  const [stages, setStages] = useState<ApiStage[]>([])
  // Server clock minus device clock, so the 15-minute congestion check ignores device time.
  const [clockOffset, setClockOffset] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const reload = useCallback(() => {
    setLoad({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const applyStages = useCallback((items: ApiStage[]) => {
    setStages(items)
    const serverTime = items[0]?.serverTime
    if (serverTime) setClockOffset(Date.parse(serverTime) - Date.now())
  }, [])
  const refreshStages = useCallback(
    () =>
      api
        .stages()
        .then(applyStages)
        .catch(() => undefined),
    [applyStages],
  )
  const applyCatalog = useCallback(
    (catalog: Catalog) => {
      const days = toDayOptions(catalog.festival, catalog.performances)
      setFestival(catalog.festival)
      setDayOptions(days)
      setStageOptions(toStageOptions(catalog.stages))
      applyStages(catalog.stages)
      setBooths([...catalog.booths.map(toBooth), ...catalog.facilities.map(toFacility)])
      setPerformances(catalog.performances.map((p) => toPerformance(p, days)))
      setNotices(catalog.notices.map(toNotice))
    },
    [applyStages],
  )
  // Only notices change through /topic/notice; re-reading just them keeps the burst small
  // when every open page receives the same broadcast.
  const refreshNotices = useCallback(
    () =>
      api
        .notices()
        .then((items) => setNotices(items.map(toNotice)))
        .catch(() => undefined),
    [],
  )
  useTopic(isApiMode && load.status === 'ready' ? '/topic/notice' : null, refreshNotices)
  // A congestion message carries the changed zone, so it is merged without any request.
  // An unknown zone (just created) falls back to re-reading the stage list.
  const live = useRealtimeConnected()
  useTopic(isApiMode && load.status === 'ready' ? '/topic/congestion' : null, (body) => {
    const zone = body as (ApiZone & { type?: string }) | null
    if (!zone || typeof zone.zoneId !== 'number') return void refreshStages()
    // Decided from the rendered state: a state updater runs later, so it cannot report back here.
    const known = stages.some((stage) => stage.zones?.some((z) => z.zoneId === zone.zoneId))
    if (!known) return void refreshStages()
    setStages((items) =>
      items.map((stage) => ({
        ...stage,
        zones: stage.zones?.map((z) => {
          if (z.zoneId !== zone.zoneId) return z
          return {
            ...z,
            level: zone.level,
            estimatedPeople: zone.estimatedPeople,
            updatedAt: zone.updatedAt,
          }
        }),
      })),
    )
  })
  // Catches up within 15s when the socket is down (STG-005), 60s as a safety net otherwise.
  useEffect(() => {
    if (!isApiMode || load.status !== 'ready') return
    const timer = window.setInterval(
      () => {
        if (document.visibilityState === 'visible') void refreshStages()
      },
      pollEvery(live, 15000),
    )
    return () => window.clearInterval(timer)
  }, [live, load.status, refreshStages])
  // Re-reads the catalog after an admin save without showing the full-page loader.
  const refresh = useCallback(() => fetchCatalog().then(applyCatalog), [applyCatalog])

  useEffect(() => {
    if (!isApiMode) return
    let active = true
    fetchCatalog()
      .then((catalog) => {
        if (!active) return
        applyCatalog(catalog)
        setLoad({ status: 'ready' })
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoad({
          status: 'error',
          message: error instanceof Error ? error.message : '축제 정보를 불러오지 못했어요.',
        })
      })
    return () => {
      active = false
    }
  }, [attempt, applyCatalog])

  return (
    <DemoContext.Provider
      value={{
        booths,
        setBooths,
        notices,
        setNotices,
        performances,
        setPerformances,
        ticket,
        setTicket,
        queue,
        setQueue,
        settings,
        setSettings,
        load,
        reload,
        refresh,
        festival,
        dayOptions,
        stageOptions,
        stages,
        clockOffset,
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}
