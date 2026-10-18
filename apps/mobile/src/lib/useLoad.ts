import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

/** useLoad fetches a path and re-fetches when it changes or reload() is called. */
export function useLoad<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!path) return
    let live = true
    setError('')
    api<T>(path).then((d) => live && setData(d)).catch((e) => live && setError((e as Error).message))
    return () => { live = false }
  }, [path, n])
  const reload = useCallback(() => setN((x) => x + 1), [])
  return { data, error, reload }
}
