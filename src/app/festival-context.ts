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
}
export const FestivalContext = createContext<
  (FestivalData & { refresh: () => Promise<void> }) | null
>(null)
export function useFestival() {
  const value = useContext(FestivalContext)
  if (!value) throw new Error('FestivalProvider is required')
  return value
}
