import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import axios from 'axios'
import { errorMessage, SESSION_EXPIRED } from '../apis/axios'
import type { Account } from '../apis/type'
import { reconnectRealtime } from '../apis/realtime'
import { useAuthApi } from '../hooks/useAuthApi'
import { AuthContext } from './auth-context'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const version = useRef(0)
  const started = useRef(false)
  const refresh = useCallback(async () => {
    started.current = true
    const current = ++version.current
    setLoading(true)
    setError('')
    try {
      const response = await useAuthApi.me()
      if (current === version.current) {
        setAccount(response.data.data)
        void reconnectRealtime()
      }
    } catch (e) {
      if (current === version.current) {
        setAccount(null)
        if (!axios.isAxiosError(e) || e.response?.status !== 401) setError(errorMessage(e))
      }
    } finally {
      if (current === version.current) setLoading(false)
    }
  }, [])
  const ensure = useCallback(() => {
    if (!started.current) void refresh()
  }, [refresh])
  // Public visitors never request an admin session.
  useEffect(() => {
    const expired = () => {
      version.current++
      setAccount(null)
      setError('')
      setLoading(false)
      void reconnectRealtime()
    }
    window.addEventListener(SESSION_EXPIRED, expired)
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      version.current++
      started.current = false
      window.removeEventListener(SESSION_EXPIRED, expired)
    }
  }, [refresh])
  async function login(loginId: string, password: string) {
    version.current++
    const response = await useAuthApi.login({ loginId, password })
    setAccount(response.data.data.account)
    setError('')
    setLoading(false)
    void reconnectRealtime()
  }
  async function logout() {
    await useAuthApi.logout()
    version.current++
    setAccount(null)
    void reconnectRealtime()
  }
  return (
    <AuthContext.Provider value={{ account, loading, error, ensure, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
