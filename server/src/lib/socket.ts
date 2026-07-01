import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'

let io: Server | null = null

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  })

  io.on('connection', (socket) => {
    socket.on('admin:join', () => {
      socket.join('admin')
    })
  })

  return io
}

export function getIo() {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

export function emitAdmin(event: string, payload: unknown) {
  getIo().to('admin').emit(event, payload)
}
