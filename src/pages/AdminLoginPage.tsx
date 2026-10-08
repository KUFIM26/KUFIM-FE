import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAdminSession } from '../app/admin-session'
import { Page } from '../components/layout'
import { Button, Card, SectionTitle } from '../components/ui'
import { isApiMode } from '../api/config'

// Only same-app paths are accepted so the login page cannot redirect elsewhere.
const safeNext = (value: string | null) =>
  value && value.startsWith('/admin') && !value.startsWith('//') ? value : '/admin'

export default function AdminLoginPage() {
  const { account, ensure, login } = useAdminSession()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const next = safeNext(params.get('next'))
  useEffect(ensure, [ensure])
  if (!isApiMode || account) return <Navigate to={next} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(loginId.trim(), password)
      navigate(next, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '로그인하지 못했어요.')
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Page title="관리자 로그인" back="/">
      <form className="page-pad" onSubmit={submit}>
        <Card className="flex flex-col gap-5 p-5">
          <label className="form-field">
            <SectionTitle dot>아이디</SectionTitle>
            <input
              required
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="form-control"
              placeholder="관리자 아이디"
            />
          </label>
          <label className="form-field">
            <SectionTitle dot>비밀번호</SectionTitle>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              placeholder="비밀번호"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </Card>
        <Button type="submit" disabled={submitting}>
          {submitting ? '로그인 중…' : '로그인'}
        </Button>
      </form>
    </Page>
  )
}
