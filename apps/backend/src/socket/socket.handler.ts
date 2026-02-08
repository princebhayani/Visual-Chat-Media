import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../features/auth/jwt.service';
import { chatSocketHandler } from './chat.socket';
import { callSocketHandler } from './call.socket';
import { setUserOnline, setUserOffline } from '../features/user/user.service';
import { logger } from '../lib/logger';
import { SOCKET_EVENTS } from '@ai-chat/shared';
import type { ClientToServerEvents, ServerToClientEvents } from '@ai-chat/shared';

export interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId: string;
}

// Track userId -> Set of socket ids for multi-device support
const userSockets = new Map<string, Set<string>>();

export function getUserSocketIds(userId: string): Set<string> {
  return userSockets.get(userId) || new Set();
}

export function setupSocketIO(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
) {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) return next(new Error('Authentication required'));

    const payload = verifyAccessToken(token);
    if (!payload) return next(new Error('Invalid token'));

    (socket as AuthenticatedSocket).userId = payload.userId;
    next();
  });

  io.on('connection', async (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId = authSocket.userId;
    logger.info(`User connected: ${userId}`);

    // Track socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user's personal room (for DMs, notifications, presence)
    socket.join(`user:${userId}`);

    // Set user online + broadcast presence
    try {
      await setUserOnline(userId);
      io.emit(SOCKET_EVENTS.USER_ONLINE, { userId });
    } catch (err) {
      logger.error(`Failed to set user online: ${userId}`, err);
    }

    // Register socket handlers
    chatSocketHandler(io, authSocket);
    callSocketHandler(io, authSocket);

    // Handle typing events
    socket.on(SOCKET_EVENTS.TYPING_START, (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING, {
        conversationId,
        userId,
        userName: '', // Client should resolve from member list
        isTyping: true,
      });
    });

    socket.on(SOCKET_EVENTS.TYPING_STOP, (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING, {
        conversationId,
        userId,
        userName: '',
        isTyping: false,
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${userId}`);

      // Remove socket from tracking
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);

          // Only set offline if no more connections
          try {
            const lastSeenAt = await setUserOffline(userId);
            io.emit(SOCKET_EVENTS.USER_OFFLINE, {
              userId,
              lastSeenAt: lastSeenAt.toISOString(),
            });
          } catch (err) {
            logger.error(`Failed to set user offline: ${userId}`, err);
          }
        }
      }
    });

    socket.on('error', (err) => {
      logger.error(`Socket error for user ${userId}:`, err.message);
    });
  });
}
