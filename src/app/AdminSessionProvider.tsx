import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isApiMode } from '../api/config'
import { api } from '../api/endpoints'
import { ApiError, adminUnauthorizedEvent } from '../api/client'
import type { ApiAdminAccount } from '../api/types'
import { StatusMessage } from '../components/layout'
import { reconnectRealtime } from '../api/realtime'
import { AdminSessionContext, useAdminSession } from './admin-session'
import type { AdminSession } from './admin-session'

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminSession['status']>(isApiMode ? 'checking' : 'ready')
  const [account, setAccount] = useState<ApiAdminAccount | null>(null)
  const [error, setError] = useState<Error | null>(null)
  // 0 until an admin page asks, so public visitors never call /admin/auth/me.
  const [attempt, setAttempt] = useState(0)

  // Restores an existing KUFIMSESSION cookie after a reload.
  useEffect(() => {
    if (!isApiMode || attempt === 0) return
    let active = true
    api.admin
      .me()
      .then((me) => {
        if (active) setAccount(me)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setAccount(null)
        // 401 only means "not logged in"; anything else must not look like a logout.
        if (!(reason instanceof ApiError && reason.status === 401)) setError(reason as Error)
      })
      .finally(() => {
        if (active) setStatus('ready')
      })
    return () => {
      active = false
    }
  }, [attempt])

  // Any admin request answered with 401 (expired or forced logout) ends the session here.
  useEffect(() => {
    const expire = () => setAccount(null)
    window.addEventListener(adminUnauthorizedEvent, expire)
    return () => window.removeEventListener(adminUnauthorizedEvent, expire)
  }, [])

  const login = useCallback(async (loginId: string, password: string) => {
    const result = await api.admin.login(loginId, password)
    setError(null)
    setAccount(result.account)
    void reconnectRealtime()
  }, [])
  const logout = useCallback(async () => {
    try {
      await api.admin.logout()
    } finally {
      setAccount(null)
      void reconnectRealtime()
    }
  }, [])
  const ensure = useCallback(() => setAttempt((n) => n || 1), [])
  const recheck = useCallback(() => {
    setError(null)
    setStatus('checking')
    setAttempt((n) => n + 1)
  }, [])
  const canManage = useCallback(
    (boothId: string) =>
      !isApiMode ||
      account?.role === 'SUPER_ADMIN' ||
      !!account?.managedBoothIds.includes(Number(boothId)),
    [account],
  )

  return (
    <AdminSessionContext.Provider
      value={{ status, account, error, ensure, login, logout, recheck, canManage }}
    >
      {children}
    </AdminSessionContext.Provider>
  )
}

// Admin routes stay open in the mock demo; with the backend they require a session.
export function AdminGate() {
  const { status, account, error, ensure, recheck } = useAdminSession()
  const location = useLocation()
  useEffect(ensure, [ensure])
  if (!isApiMode) return <Outlet />
  if (status === 'checking') return <StatusMessage>관리자 정보를 확인하는 중이에요.</StatusMessage>
  if (error) return <StatusMessage onRetry={recheck}>{error.message}</StatusMessage>
  if (!account) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/admin/login?next=${next}`} replace />
  }
  return <Outlet />
}
