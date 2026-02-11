import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@ai-chat/shared';
import { SOCKET_URL } from './constants';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function connectSocket(
  token: string,
): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socket?.connected) return socket;

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
