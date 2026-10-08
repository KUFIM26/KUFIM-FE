import { useCallback, useEffect, useRef, useState } from 'react'
import type { DependencyList } from 'react'

type AsyncState<T> = { data: T | undefined; error: Error | null; loading: boolean }

// Runs `load` when deps change and, with `pollMs`, again on an interval while the tab is visible.
// Pass `null` instead of a function to skip loading (for example in mock mode).
export function useAsync<T>(
  load: (() => Promise<T>) | null,
  deps: DependencyList,
  pollMs?: number,
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    error: null,
    loading: !!load,
  })
  const loadRef = useRef(load)
  loadRef.current = load
  const generation = useRef(0)

  const run = useCallback(async () => {
    const current = loadRef.current
    if (!current) return
    const id = ++generation.current
    try {
      const data = await current()
      if (id === generation.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (id === generation.current)
        setState((previous) => ({ ...previous, error: error as Error, loading: false }))
    }
  }, [])

  useEffect(() => {
    if (!loadRef.current) return
    setState((previous) => ({ ...previous, loading: true }))
    void run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run()
    }
    const timer = pollMs ? window.setInterval(onVisible, pollMs) : undefined
    if (pollMs) document.addEventListener('visibilitychange', onVisible)
    const pending = generation
    return () => {
      // Drops responses that arrive after the deps changed or the page unmounted.
      pending.current++
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, pollMs, run])

  return { ...state, reload: run }
}
