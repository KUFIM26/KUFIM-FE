import api from '../apis/axios'
import type { ApiResponse } from '../apis/type'

export type CongestionLevel = 'SMOOTH' | 'NORMAL' | 'CROWDED' | 'VERY_CROWDED'
export type CongestionInput = { level: CongestionLevel; estimatedPeople: number | null }
export type CongestionZone = {
  zoneId: number
  stageId: number
  name: string
  displayOrder: number
  active: boolean
  level: CongestionLevel | null
  estimatedPeople: number | null
  updatedAt: string | null
}

export const congestionApi = {
  zones: async (stageId: number) =>
    (await api.get<ApiResponse<{ zones: CongestionZone[] }>>(`/admin/stages/${stageId}/zones`)).data
      .data.zones,
  save: (zoneId: number, input: CongestionInput) =>
    api.post<ApiResponse<CongestionZone>>(`/admin/zones/${zoneId}/congestion`, input),
}
