import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { boothSeed, noticeSeed, performanceSeed, queueSeed } from '../data/mock'
import type { Booth, Notice, Performance } from '../data/mock'
import { DemoContext } from './demo-context'
import type { LoadState, Settings, Ticket } from './demo-context'
import type { Option } from '../components/ui'
import { isApiMode } from '../api/config'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { ApiFestival } from '../api/types'
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
  const [attempt, setAttempt] = useState(0)
  const reload = useCallback(() => {
    setLoad({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!isApiMode) return
    let active = true
    Promise.all([
      optional(api.festival()),
      api.booths(),
      api.facilities(),
      api.stages(),
      api.performances(),
      api.notices(),
    ])
      .then(([festivalData, boothData, facilityData, stageData, performanceData, noticeData]) => {
        if (!active) return
        const days = toDayOptions(festivalData, performanceData)
        setFestival(festivalData)
        setDayOptions(days)
        setStageOptions(toStageOptions(stageData))
        setBooths([...boothData.map(toBooth), ...facilityData.map(toFacility)])
        setPerformances(performanceData.map((p) => toPerformance(p, days)))
        setNotices(noticeData.map(toNotice))
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
  }, [attempt])

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
        festival,
        dayOptions,
        stageOptions,
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}
