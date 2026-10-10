import { useState } from 'react'

// Downloads an admin CSV export (UTF-8 BOM, no personal data) and reports failures inline.
export function CsvDownload({
  label,
  filename,
  load,
}: {
  label: string
  filename: string
  load: () => Promise<Blob>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const download = async () => {
    setBusy(true)
    setError('')
    try {
      const url = URL.createObjectURL(await load())
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="text-sm font-bold text-brand underline disabled:opacity-50"
      >
        {busy ? '내려받는 중…' : label}
      </button>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
