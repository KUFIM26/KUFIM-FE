import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../apis/axios'

// Pass a memoized loader. Old requests cannot overwrite a newer route or refresh.
export function useResource<T>(loader: () => Promise<T>, pollMs = 0) {
  const [state, setState] = useState<{
    data?: T
    error: string
    loading: boolean
    loader?: () => Promise<T>
  }>({ error: '', loading: true })
  const version = useRef(0)
  const refresh = useCallback(async () => {
    const current = ++version.current
    try {
      const data = await loader()
      if (current === version.current) setState({ data, error: '', loading: false, loader })
    } catch (error) {
      if (current === version.current)
        setState((s) => ({
          data: s.loader === loader ? s.data : undefined,
          error: errorMessage(error),
          loading: false,
          loader,
        }))
    }
  }, [loader])
  useEffect(() => {
    let disposed = false
    let timer: number | undefined
    const poll = async () => {
      if (!document.hidden || !pollMs) await refresh()
      if (!disposed && pollMs) timer = window.setTimeout(() => void poll(), pollMs)
    }
    void poll()
    return () => {
      disposed = true
      // This is a request generation counter, not a DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      version.current++
      window.clearTimeout(timer)
    }
  }, [refresh, pollMs])
  return {
    ...(state.loader === loader ? state : { data: undefined, error: '', loading: true }),
    refresh,
  }
}

export function useAction() {
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function run(action: () => Promise<void>) {
    if (lock.current) return false
    lock.current = true
    setPending(true)
    setError('')
    try {
      await action()
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    } finally {
      lock.current = false
      setPending(false)
    }
  }
  return { run, pending, error }
}
