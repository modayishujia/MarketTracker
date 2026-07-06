import { useState, useEffect, useCallback } from 'react'

export function useIPC<T>(channel: string, ...args: any[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const api = (window as any).electronAPI
      const keys = channel.split('.')
      let method = api
      for (const key of keys) method = method[key]
      const result = await method(...args)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [channel, ...args])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, refetch: fetchData }
}
