import type { Booth } from '../data/mock'
import { isApiMode } from './config'
import { api } from './endpoints'
import { useAsync } from './useAsync'
import { pollEvery, useRealtimeConnected, useTopic } from './realtime'

// Adds the description and the live queue size, which the booth list response does not carry.
export function useLiveBooth(booth: Booth | undefined, pollMs = 15000) {
  const isBooth = isApiMode && !!booth && booth.period !== 'facility'
  const detail = useAsync(isBooth ? () => api.booth(booth!.id) : null, [booth?.id])
  const connected = useRealtimeConnected()
  const status = useAsync(
    isBooth ? () => api.waitingStatus(booth!.id) : null,
    [booth?.id],
    pollEvery(connected, pollMs),
  )
  useTopic(isBooth ? `/topic/booth/${booth!.id}/waiting` : null, status.reload)
  const live: Booth | undefined =
    booth && isBooth
      ? {
          ...booth,
          description: detail.data?.description ?? booth.description,
          teams: booth.waitingEnabled ? status.data?.waitingTeamCount : undefined,
          minutes: booth.waitingEnabled ? status.data?.estimatedWaitMinutes : undefined,
        }
      : booth
  return { booth: live, status }
}
