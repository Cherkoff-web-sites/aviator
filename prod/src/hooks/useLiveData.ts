import * as React from 'react'
import { io } from 'socket.io-client'
import { getApiBase } from '@/lib/api'

export function useStoreSocket(onUpdate: () => void) {
  const onUpdateRef = React.useRef(onUpdate)
  onUpdateRef.current = onUpdate

  React.useEffect(() => {
    const base = getApiBase() || window.location.origin
    const socket = io(base, { transports: ['websocket', 'polling'] })
    socket.emit('admin:join')
    const handler = () => onUpdateRef.current()
    socket.on('store:updated', handler)
    socket.on('booking:created', handler)
    socket.on('booking:updated', handler)
    socket.on('booking:deleted', handler)
    return () => {
      socket.off('store:updated', handler)
      socket.disconnect()
    }
  }, [])
}

export function useLiveData<T>(loader: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)

  const reload = React.useCallback(async () => {
    setLoading(true)
    try {
      const result = await loader()
      setData(result)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useStoreSocket(reload)

  React.useEffect(() => {
    void reload()
  }, [reload])

  return { data, loading, reload, setData }
}
