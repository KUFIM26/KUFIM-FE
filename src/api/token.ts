const storageKey = 'kufim.clientToken'
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
let memoryToken: string | null = null

export function randomUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // crypto.randomUUID is missing on plain-http LAN addresses, which phones use in local testing.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// The backend ties a waiting ticket to this browser token, so it must survive reloads.
export function getClientToken() {
  if (memoryToken) return memoryToken
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved && uuidV4.test(saved)) return (memoryToken = saved)
    memoryToken = randomUuid()
    localStorage.setItem(storageKey, memoryToken)
  } catch {
    memoryToken ??= randomUuid()
  }
  return memoryToken
}
