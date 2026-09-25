import { useState } from 'react'
import type { ReactNode } from 'react'
import { boothSeed, noticeSeed, performanceSeed, queueSeed } from '../data/mock'
import { DemoContext } from './demo-context'
import type { Settings, Ticket } from './demo-context'
export function DemoProvider({ children }: { children: ReactNode }) {
  const [booths, setBooths] = useState(boothSeed)
  const [notices, setNotices] = useState(noticeSeed)
  const [performances, setPerformances] = useState(performanceSeed)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [queue, setQueue] = useState(queueSeed)
  const [settings, setSettings] = useState<Record<string, Settings>>({
    'booth-1': { status: '운영 중', minutes: 50, cancelMinutes: 10 },
  })
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
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}
