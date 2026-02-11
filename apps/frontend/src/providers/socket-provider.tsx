'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@ai-chat/shared';
import { connectSocket, disconnectSocket } from '@/lib/socket-client';
import { useAuthStore } from '@/store/auth-store';

type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SocketContext = createContext<{
  socket: ChatSocket | null;
  isConnected: boolean;
}>({ socket: null, isConnected: false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<ChatSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const tokens = useAuthStore((s) => s.tokens);

  useEffect(() => {
    if (!tokens?.accessToken) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const sock = connectSocket(tokens.accessToken);
    setSocket(sock);

    sock.on('connect', () => setIsConnected(true));
    sock.on('disconnect', () => setIsConnected(false));
    sock.on('connect_error', () => setIsConnected(false));

    return () => {
      sock.off('connect');
      sock.off('disconnect');
      sock.off('connect_error');
    };
  }, [tokens?.accessToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  return useContext(SocketContext);
}
