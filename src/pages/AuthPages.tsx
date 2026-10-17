import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../app/auth-context'
import { FestivalProvider } from '../app/FestivalProvider'
import { Page } from '../components/layout'
import { Button } from '../components/ui'
import { RequestState } from '../components/RequestState'
import { useAction } from '../hooks/useResource'
export function AdminGuard() {
  const { account, loading, error, ensure, refresh } = useAuth()
  const location = useLocation()
  useEffect(ensure, [ensure])
  if (loading || error)
    return <RequestState loading={loading} error={error} retry={() => void refresh()} />
  if (!account)
    return (
      <Navigate
        to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  if (
    account.role === 'BOOTH_ADMIN' &&
    location.pathname !== '/admin' &&
    !location.pathname.startsWith('/admin/waiting')
  )
    return <Navigate to="/admin/waiting" replace />
  return (
    <FestivalProvider key={account.accountId} admin>
      <Outlet />
    </FestivalProvider>
  )
}
export function LoginPage() {
  const auth = useAuth()
  const { ensure } = auth
  useEffect(ensure, [ensure])
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const action = useAction()
  const navigate = useNavigate()
  if (auth.account) return <Navigate to="/" replace />
  return (
    <Page title="관리자 로그인" back="/menu">
      <form
        className="page-pad"
        onSubmit={(e) => {
          e.preventDefault()
          void action.run(async () => {
            await auth.login(loginId, password)
            navigate('/', { replace: true })
          })
        }}
      >
        <label className="form-field">
          아이디
          <input
            autoComplete="username"
            className="form-control"
            required
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
          />
        </label>
        <label className="form-field">
          비밀번호
          <input
            autoComplete="current-password"
            className="form-control"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <RequestState error={action.error} />
        <Button type="submit" disabled={action.pending}>
          {action.pending ? '로그인 중…' : '로그인'}
        </Button>
      </form>
    </Page>
  )
}
