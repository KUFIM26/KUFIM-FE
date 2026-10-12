import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { useResource } from '../hooks/useResource'
import { useFestivalApi } from '../hooks/useFestivalApi'
import { useBoothApi } from '../hooks/useBoothApi'
import { useFacilityApi } from '../hooks/useFacilityApi'
import { usePerformanceApi } from '../hooks/usePerformanceApi'
import { useNoticeApi } from '../hooks/useNoticeApi'
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
    const [festival, stageRes, map, pinRes, boothRes, facilityRes, performanceRes, noticeRes] =
      await Promise.all([
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
        admin ? useBoothApi.adminFindAll() : useBoothApi.findAll(),
        superAdmin ? useFacilityApi.adminFindAll() : useFacilityApi.findAll(),
        superAdmin ? usePerformanceApi.adminFindAll() : usePerformanceApi.findAll(),
        useNoticeApi.findAll(),
      ])
    const stages = stageRes.data.data
    return {
      festival,
      stages,
      floorplan: map,
      pins: pinRes.data.data,
      booths: [...boothRes.data.data.map(boothView), ...facilityRes.data.data.map(facilityView)],
      performances: performanceRes.data.data.map((p) => performanceView(p, stages)),
      notices: noticeRes.data.data.map(noticeView),
    }
  }, [admin, superAdmin])
  const resource = useResource(loader)
  if (!resource.data)
    return (
      <RequestState
        loading={resource.loading}
        error={resource.error}
        retry={() => void resource.refresh()}
      />
    )
  return (
    <FestivalContext.Provider value={{ ...resource.data, refresh: resource.refresh }}>
      <RequestState error={resource.error} retry={() => void resource.refresh()} />
      {children}
    </FestivalContext.Provider>
  )
}
