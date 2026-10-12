import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import axios from 'axios'
import { errorMessage, SESSION_EXPIRED } from '../apis/axios'
import type { Account } from '../apis/type'
import { useAuthApi } from '../hooks/useAuthApi'
import { AuthContext } from './auth-context'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const version = useRef(0)
  const refresh = useCallback(async () => {
    const current = ++version.current
    setLoading(true)
    setError('')
    try {
      const response = await useAuthApi.me()
      if (current === version.current) setAccount(response.data.data)
    } catch (e) {
      if (current === version.current) {
        setAccount(null)
        if (!axios.isAxiosError(e) || e.response?.status !== 401) setError(errorMessage(e))
      }
    } finally {
      if (current === version.current) setLoading(false)
    }
  }, [])
  // Session lookup starts on mount; the counter invalidates stale network responses on cleanup.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react/set-state-in-effect
  useEffect(() => {
    void refresh()
    const expired = () => setAccount(null)
    window.addEventListener(SESSION_EXPIRED, expired)
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      version.current++
      window.removeEventListener(SESSION_EXPIRED, expired)
    }
  }, [refresh])
  async function login(loginId: string, password: string) {
    version.current++
    const response = await useAuthApi.login({ loginId, password })
    setAccount(response.data.data.account)
    setError('')
    setLoading(false)
  }
  async function logout() {
    await useAuthApi.logout()
    version.current++
    setAccount(null)
  }
  return (
    <AuthContext.Provider value={{ account, loading, error, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
