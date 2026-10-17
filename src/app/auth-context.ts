import { createContext, useContext } from 'react'
import type { Account } from '../apis/type'
export type AuthState = {
  account: Account | null
  loading: boolean
  error: string
  ensure: () => void
  refresh: () => Promise<void>
  checkSession: (onChecked?: (session: Account | null) => void) => Promise<Account | null>
  login: (loginId: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
export const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}
