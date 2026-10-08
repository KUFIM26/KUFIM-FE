import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { queueSeed } from '../data/mock'
import type { Booth, Notice, Performance } from '../data/mock'

export type Ticket = {
  boothId: string
  number: number
  people: number
  position: number
  minutes: number
  registered: string
}
export type Settings = { status: string; minutes: number; cancelMinutes: number }
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
}
export const DemoContext = createContext<DemoState | null>(null)
export function useDemo() {
  const state = useContext(DemoContext)
  if (!state) throw new Error('DemoProvider is required')
  return state
}
