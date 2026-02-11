import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { connectRedis } from './config/redis';
import { setupSocketIO } from './socket/socket.handler';
import { setIO } from './lib/socket-io';
import { logger } from './lib/logger';
import type { ClientToServerEvents, ServerToClientEvents } from '@ai-chat/shared';

async function main() {
  // Connect to Redis
  await connectRedis();

  const app = createApp();
  const httpServer = createServer(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Make io accessible globally
  app.set('io', io);
  setIO(io);

  setupSocketIO(io);

  httpServer.listen(env.PORT, () => {
    logger.info(`Server running on http://localhost:${env.PORT}`);
    logger.info(`Frontend URL: ${env.FRONTEND_URL}`);
    logger.info(`Gemini Model: ${env.GEMINI_MODEL}`);
  });
}

main().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
