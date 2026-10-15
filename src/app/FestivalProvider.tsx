import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { useResource } from '../hooks/useResource'
import { useFestivalApi } from '../hooks/useFestivalApi'
import { useBoothApi } from '../hooks/useBoothApi'
import { useFacilityApi } from '../hooks/useFacilityApi'
import { usePerformanceApi } from '../hooks/usePerformanceApi'
import { useNoticeApi } from '../hooks/useNoticeApi'
import { pollEvery, useRealtimeConnected, useTopic, useTopics } from '../apis/realtime'
import { isNotFound } from '../apis/axios'
import { boothView, facilityView, noticeView, performanceView } from '../apis/adapters'
import { RequestState } from '../components/RequestState'
import { FestivalContext } from './festival-context'
import { useAuth } from './auth-context'

export function FestivalProvider({
  children,
  admin = false,
}: {
  children: ReactNode
  admin?: boolean
}) {
  const { account } = useAuth()
  const superAdmin = admin && account?.role === 'SUPER_ADMIN'
  const loader = useCallback(async () => {
    const [festival, stageRes, map, pinRes, facilityRes, performanceRes] = await Promise.all([
      useFestivalApi
        .find()
        .then((r) => r.data.data)
        .catch((e) => {
          if (isNotFound(e)) return null
          throw e
        }),
      useFestivalApi.stages(),
      useFestivalApi
        .map()
        .then((r) => r.data.data.floorplan)
        .catch((e) => {
          if (isNotFound(e)) return null
          throw e
        }),
      useFestivalApi.pins(),
      superAdmin ? useFacilityApi.adminFindAll() : useFacilityApi.findAll(),
      superAdmin ? usePerformanceApi.adminFindAll() : usePerformanceApi.findAll(),
    ])
    const stages = stageRes.data.data
    return {
      festival,
      stages,
      floorplan: map,
      pins: pinRes.data.data,
      facilities: facilityRes.data.data.map(facilityView),
      performances: performanceRes.data.data.map((p) => performanceView(p, stages)),
    }
  }, [superAdmin])
  const live = useRealtimeConnected()
  const resource = useResource(loader)
  const boothLoader = useCallback(
    async () =>
      (await (admin ? useBoothApi.adminFindAll() : useBoothApi.findAll())).data.data.map(boothView),
    [admin],
  )
  const noticeLoader = useCallback(
    async () => (await useNoticeApi.findAll()).data.data.map(noticeView),
    [],
  )
  const boothResource = useResource(boothLoader, pollEvery(live, 15000))
  const noticeResource = useResource(noticeLoader, pollEvery(live, 15000))
  useTopics(
    (boothResource.data ?? [])
      .filter((b) => b.waitingEnabled)
      .map((b) => `/topic/booth/${b.id}/waiting`),
    boothResource.refresh,
  )
  useTopic('/topic/notice', noticeResource.refresh)
  const { refresh: refreshCatalog } = resource
  const { refresh: refreshBooths } = boothResource
  const { refresh: refreshNotices } = noticeResource
  const refresh = useCallback(async () => {
    await Promise.all([refreshCatalog(), refreshBooths(), refreshNotices()])
  }, [refreshCatalog, refreshBooths, refreshNotices])
  const error = resource.error || boothResource.error || noticeResource.error
  const loading = resource.loading || boothResource.loading || noticeResource.loading
  if (!resource.data || !boothResource.data || !noticeResource.data)
    return <RequestState loading={loading} error={error} retry={() => void refresh()} />
  return (
    <FestivalContext.Provider
      value={{
        ...resource.data,
        booths: [...boothResource.data, ...resource.data.facilities],
        notices: noticeResource.data,
        refresh,
      }}
    >
      <RequestState error={error} retry={() => void refresh()} />
      {children}
    </FestivalContext.Provider>
  )
}
