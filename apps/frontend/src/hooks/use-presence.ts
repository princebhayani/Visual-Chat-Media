'use client';

import { useEffect } from 'react';
import { useSocket } from './use-socket';
import { useUserStore } from '@/store/user-store';
import { SOCKET_EVENTS } from '@ai-chat/shared';

export function usePresence() {
  const { socket } = useSocket();
  const { onlineUsers, setUserOnline, setUserOffline, isOnline } = useUserStore();

  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (data: { userId: string }) => {
      setUserOnline(data.userId);
    };

    const handleUserOffline = (data: { userId: string; lastSeenAt: string }) => {
      setUserOffline(data.userId);
    };

    socket.on(SOCKET_EVENTS.USER_ONLINE, handleUserOnline);
    socket.on(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline);

    return () => {
      socket.off(SOCKET_EVENTS.USER_ONLINE, handleUserOnline);
      socket.off(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline);
    };
  }, [socket, setUserOnline, setUserOffline]);

  return { onlineUsers, isOnline };
}
