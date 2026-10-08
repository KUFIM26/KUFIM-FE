import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Client } from '@stomp/stompjs'
import type { StompSubscription } from '@stomp/stompjs'
import { apiBaseUrl, isApiMode } from './config'
import { getClientToken } from './token'

// One shared STOMP connection to KUFIM-BE's /ws. Messages only say "something changed";
// pages re-read the data over REST, so a missed message is repaired by the next poll.
type Entry = { destination: string; listeners: Set<() => void>; sub?: StompSubscription }
const entries = new Map<string, Entry>()
const stateListeners = new Set<() => void>()
let connected = false
let client: Client | null = null
let idleTimer: number | undefined

function brokerUrl() {
  const base = new URL(apiBaseUrl || window.location.origin, window.location.href)
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/ws`
  return base.toString()
}
function setConnected(value: boolean) {
  if (connected === value) return
  connected = value
  stateListeners.forEach((listener) => listener())
}
function attach(entry: Entry) {
  if (!client?.connected || entry.sub) return
  entry.sub = client.subscribe(entry.destination, () =>
    entry.listeners.forEach((listener) => listener()),
  )
}

function ensureClient() {
  window.clearTimeout(idleTimer)
  if (client) return
  let failures = 0
  client = new Client({
    brokerURL: brokerUrl(),
    // The backend binds personal waiting topics to this token at CONNECT.
    connectHeaders: { 'X-Client-Token': getClientToken() },
    reconnectDelay: 5000,
    onConnect: () => {
      failures = 0
      client!.reconnectDelay = 5000
      entries.forEach((entry) => {
        entry.sub = undefined
        attach(entry)
      })
      setConnected(true)
    },
    // A rejected subscription closes the socket; back off so polling carries the load.
    onStompError: () => {
      failures++
      client!.reconnectDelay = Math.min(60000, 5000 * 2 ** failures)
    },
    onWebSocketClose: () => {
      entries.forEach((entry) => (entry.sub = undefined))
      setConnected(false)
    },
  })
  client.activate()
}
function releaseIfIdle() {
  if (entries.size) return
  // Short grace period so moving between pages does not reconnect.
  idleTimer = window.setTimeout(() => {
    if (entries.size || !client) return
    void client.deactivate()
    client = null
    setConnected(false)
  }, 10000)
}

// The admin session is read once at the WebSocket handshake, so log in/out must reconnect.
export async function reconnectRealtime() {
  if (!client) return
  const old = client
  client = null
  setConnected(false)
  await old.deactivate()
  if (entries.size) ensureClient()
}

export function subscribe(destination: string, listener: () => void) {
  let entry = entries.get(destination)
  if (!entry) {
    entry = { destination, listeners: new Set() }
    entries.set(destination, entry)
  }
  entry.listeners.add(listener)
  ensureClient()
  attach(entry)
  return () => {
    const current = entries.get(destination)
    if (!current) return
    current.listeners.delete(listener)
    if (current.listeners.size) return
    current.sub?.unsubscribe()
    entries.delete(destination)
    releaseIfIdle()
  }
}

const subscribeState = (listener: () => void) => {
  stateListeners.add(listener)
  return () => stateListeners.delete(listener)
}
export const useRealtimeConnected = () => useSyncExternalStore(subscribeState, () => connected)

// Calls `onChange` for each message on `destination` (null pauses the subscription).
// Returns whether the realtime connection is up, so callers can slow their polling.
export function useTopic(destination: string | null, onChange: () => void) {
  const handler = useRef(onChange)
  useEffect(() => {
    handler.current = onChange
  })
  useEffect(() => {
    if (!isApiMode || !destination) return
    return subscribe(destination, () => handler.current())
  }, [destination])
  const live = useRealtimeConnected()
  return isApiMode && !!destination && live
}

// Polling interval while the socket is down, and the safety net while it is up.
export const pollEvery = (live: boolean, fallbackMs: number) => (live ? 60000 : fallbackMs)
