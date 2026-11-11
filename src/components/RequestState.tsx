import { Button } from './ui'
export function RequestState({
  loading,
  error,
  retry,
}: {
  loading?: boolean
  error?: string
  retry?: () => void
}) {
  if (loading)
    return (
      <div className="loading-overlay" role="status">
        <div className="loading-card">
          <span className="loading-spinner" aria-hidden />
          <p className="text-sm font-semibold text-[#383838]">불러오는 중…</p>
          <span className="loading-bar" aria-hidden />
        </div>
      </div>
    )
  if (!error) return null
  return (
    <div className="flex flex-col gap-3 p-5">
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
      {retry && <Button onClick={retry}>다시 시도</Button>}
    </div>
  )
}
