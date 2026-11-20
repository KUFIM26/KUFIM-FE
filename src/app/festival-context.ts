import { createContext, useContext } from 'react'
import type { Festival, Stage, Floorplan, MapPin } from '../apis/type'
import type { Booth, Notice, Performance } from '../data/models'
export type FestivalData = {
  festival: Festival | null
  stages: Stage[]
  floorplan: Floorplan | null
  pins: MapPin[]
  booths: Booth[]
  performances: Performance[]
  notices: Notice[]
  unreadNotifications: number
  /** 서버가 영어 저장을 지원하는지. 지원할 때만 관리자 등록 화면에 영어 칸을 보여준다. */
  englishContent: boolean
}
export const FestivalContext = createContext<
  (FestivalData & { refresh: () => Promise<void> }) | null
>(null)
export function useFestival() {
  const value = useContext(FestivalContext)
  if (!value) throw new Error('FestivalProvider is required')
  return value
}
