import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@ai-chat/shared';

let ioInstance: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export function setIO(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  ioInstance = io;
}

export function getIO(): Server<ClientToServerEvents, ServerToClientEvents> {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized. Call setIO() first.');
  }
  return ioInstance;
}
