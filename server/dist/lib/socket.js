import { Server } from 'socket.io';
let io = null;
export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: { origin: true, credentials: true },
    });
    io.on('connection', (socket) => {
        socket.on('admin:join', () => {
            socket.join('admin');
        });
    });
    return io;
}
export function getIo() {
    if (!io)
        throw new Error('Socket.io not initialized');
    return io;
}
export function emitAdmin(event, payload) {
    getIo().to('admin').emit(event, payload);
}
