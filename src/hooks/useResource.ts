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
    // 첫 요청은 탭이 숨겨져 있어도 보낸다. 주소창 입력으로 미리 렌더링되거나 백그라운드 탭에서
    // 열린 페이지는 숨김 상태로 시작하므로, 건너뛰면 다음 주기까지 로딩 화면에 머문다.
    let running = false
    const poll = async (first = false) => {
      running = true
      if (first || !document.hidden || !pollMs) await refresh()
      running = false
      if (!disposed && pollMs) timer = window.setTimeout(() => void poll(), pollMs)
    }
    void poll(true)
    // 숨겨진 동안 건너뛴 갱신은 다시 보이는 즉시 따라잡는다.
    const onVisible = () => {
      if (document.hidden || !pollMs || running) return
      window.clearTimeout(timer)
      void poll()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisible)
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
