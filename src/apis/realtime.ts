import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Client } from '@stomp/stompjs'
import type { StompSubscription } from '@stomp/stompjs'
import { getClientToken } from './axios'

type Entry = { listeners: Set<() => void>; subscription?: StompSubscription }
const entries = new Map<string, Entry>()
const stateListeners = new Set<() => void>()
let client: Client | null = null
let connected = false
let idleTimer: number | undefined

function setConnected(value: boolean) {
  if (connected === value) return
  connected = value
  stateListeners.forEach((listener) => listener())
}
function attach(destination: string, entry: Entry) {
  if (!client?.connected || entry.subscription) return
  entry.subscription = client.subscribe(destination, () => {
    entry.listeners.forEach((listener) => listener())
  })
}
function ensureClient() {
  window.clearTimeout(idleTimer)
  if (client) return
  // VITE_API_BASE_URL includes /api/v1; the broker is /ws on that origin.
  const url = new URL(import.meta.env.VITE_API_BASE_URL || '/api/v1', window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws'
  url.search = ''
  url.hash = ''
  let failures = 0
  const connection = new Client({
    brokerURL: url.toString(),
    connectHeaders: { 'X-Client-Token': getClientToken() },
    reconnectDelay: 5000,
    connectionTimeout: 10000,
    onConnect: () => {
      if (client !== connection) return
      failures = 0
      connection.reconnectDelay = 5000
      entries.forEach((entry, destination) => {
        entry.subscription = undefined
        attach(destination, entry)
      })
      setConnected(true)
    },
    onStompError: () => {
      if (client !== connection) return
      connection.reconnectDelay = Math.min(60000, 5000 * 2 ** ++failures)
      setConnected(false)
    },
    onWebSocketClose: () => {
      if (client !== connection) return
      entries.forEach((entry) => (entry.subscription = undefined))
      setConnected(false)
    },
  })
  client = connection
  connection.activate()
}

// Login/logout changes the cookie used by the WebSocket handshake.
export async function reconnectRealtime() {
  window.clearTimeout(idleTimer)
  const previous = client
  client = null
  entries.forEach((entry) => (entry.subscription = undefined))
  setConnected(false)
  if (previous) await previous.deactivate({ force: true })
  if (entries.size) ensureClient()
}
function subscribe(destination: string, listener: () => void) {
  let entry = entries.get(destination)
  if (!entry) {
    entry = { listeners: new Set() }
    entries.set(destination, entry)
  }
  entry.listeners.add(listener)
  ensureClient()
  attach(destination, entry)
  return () => {
    entry.listeners.delete(listener)
    if (entry.listeners.size) return
    if (client?.connected) entry.subscription?.unsubscribe()
    entries.delete(destination)
    if (entries.size) return
    idleTimer = window.setTimeout(() => {
      if (!entries.size) void reconnectRealtime()
    }, 10000)
  }
}
const subscribeState = (listener: () => void) => {
  stateListeners.add(listener)
  return () => stateListeners.delete(listener)
}
export const useRealtimeConnected = () => useSyncExternalStore(subscribeState, () => connected)

// A message invalidates REST data; no separate realtime data model is introduced.
export function useTopics(destinations: string[], onChange: () => void) {
  const handler = useRef(onChange)
  useEffect(() => {
    handler.current = onChange
  })
  const key = JSON.stringify([...new Set(destinations)].sort())
  useEffect(() => {
    const releases = (JSON.parse(key) as string[]).map((destination) =>
      subscribe(destination, () => handler.current()),
    )
    return () => releases.forEach((release) => release())
  }, [key])
  const live = useRealtimeConnected()
  return destinations.length > 0 && live
}
export function useTopic(destination: string | null, onChange: () => void) {
  return useTopics(destination ? [destination] : [], onChange)
}
export const pollEvery = (live: boolean, fallbackMs: number) => (live ? 60000 : fallbackMs)
