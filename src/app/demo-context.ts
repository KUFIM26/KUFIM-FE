import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { queueSeed } from '../data/mock'
import type { Booth, Notice, Performance } from '../data/mock'
import type { Option } from '../components/ui'
import type { ApiFestival } from '../api/types'

export type Ticket = {
  boothId: string
  number: number
  people: number
  position: number
  minutes: number
  registered: string
}
export type Settings = { status: string; minutes: number; cancelMinutes: number }
export type LoadState = { status: 'loading' | 'ready' | 'error'; message?: string }
type DemoState = {
  booths: Booth[]
  setBooths: Dispatch<SetStateAction<Booth[]>>
  notices: Notice[]
  setNotices: Dispatch<SetStateAction<Notice[]>>
  performances: Performance[]
  setPerformances: Dispatch<SetStateAction<Performance[]>>
  ticket: Ticket | null
  setTicket: Dispatch<SetStateAction<Ticket | null>>
  queue: typeof queueSeed
  setQueue: Dispatch<SetStateAction<typeof queueSeed>>
  settings: Record<string, Settings>
  setSettings: Dispatch<SetStateAction<Record<string, Settings>>>
  // Catalog loading from the backend. Always `ready` with the mock data source.
  load: LoadState
  reload: () => void
  festival: ApiFestival | null
  dayOptions: Option[]
  stageOptions: Option[]
}
export const DemoContext = createContext<DemoState | null>(null)
export function useDemo() {
  const state = useContext(DemoContext)
  if (!state) throw new Error('DemoProvider is required')
  return state
}
