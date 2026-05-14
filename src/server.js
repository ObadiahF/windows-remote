import http from 'node:http';

import { createApp } from './app.js';
import { attachSocketIO } from './io/index.js';

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

const app = createApp();
const server = http.createServer(app);

attachSocketIO(server);

server.listen(port, host, () => {
  console.log(`laptop-remote backend listening on http://${host}:${port}`);
  console.log(`Socket.IO endpoint: ws://${host}:${port}/socket.io/`);
});

const shutdown = (signal) => {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
