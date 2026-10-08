import { createContext, useContext } from 'react'
import type { ApiAdminAccount } from '../api/types'

export type AdminSession = {
  status: 'checking' | 'ready'
  account: ApiAdminAccount | null
  error: Error | null
  login: (loginId: string, password: string) => Promise<void>
  logout: () => Promise<void>
  recheck: () => void
  canManage: (boothId: string) => boolean
}
export const AdminSessionContext = createContext<AdminSession | null>(null)

export function useAdminSession() {
  const session = useContext(AdminSessionContext)
  if (!session) throw new Error('AdminSessionProvider is required')
  return session
}
