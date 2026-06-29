import * as React from 'react'
import { io, type Socket } from 'socket.io-client'
import { getApiBase } from '@/lib/api'

export function useAdminSocket(onEvent: (event: string, payload: unknown) => void) {
  const socketRef = React.useRef<Socket | null>(null)

  React.useEffect(() => {
    const base = getApiBase() || window.location.origin
    const socket = io(base, { transports: ['websocket', 'polling'] })
    socketRef.current = socket
    socket.emit('admin:join')

    const handler = (payload: unknown) => onEvent('booking:created', payload)
    const handler2 = (payload: unknown) => onEvent('booking:updated', payload)
    const handler3 = (payload: unknown) => onEvent('booking:deleted', payload)

    socket.on('booking:created', handler)
    socket.on('booking:updated', handler2)
    socket.on('booking:deleted', handler3)

    return () => {
      socket.off('booking:created', handler)
      socket.off('booking:updated', handler2)
      socket.off('booking:deleted', handler3)
      socket.disconnect()
    }
  }, [onEvent])
}
