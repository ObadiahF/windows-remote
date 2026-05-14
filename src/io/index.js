import { Server } from 'socket.io';

import { registerHandlers } from './handlers.js';

export function attachSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  io.on('connection', (socket) => {
    console.log(`[io] connect ${socket.id} from ${socket.handshake.address}`);
    socket.emit('welcome', { clientId: socket.id });

    registerHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[io] disconnect ${socket.id} (${reason})`);
    });
  });

  return io;
}
