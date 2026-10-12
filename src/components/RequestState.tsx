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
      <p className="p-5 text-sm text-muted" role="status">
        불러오는 중…
      </p>
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
