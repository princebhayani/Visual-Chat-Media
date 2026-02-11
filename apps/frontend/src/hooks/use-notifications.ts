'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from './use-socket';
import { useNotificationStore, type AppNotification } from '@/store/notification-store';
import { api } from '@/lib/api-client';
import { SOCKET_EVENTS } from '@ai-chat/shared';

export function useNotifications() {
  const { socket } = useSocket();
  const {
    notifications,
    unreadCount,
    setNotifications,
    addNotification,
    markRead,
    markAllRead,
    setUnreadCount,
  } = useNotificationStore();
  const fetched = useRef(false);

  // Fetch initial notifications + unread count
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const fetchData = async () => {
      try {
        const [notifData, countData] = await Promise.all([
          api.get<{ notifications: AppNotification[] }>('/api/notifications?limit=50'),
          api.get<{ count: number }>('/api/notifications/unread-count'),
        ]);
        setNotifications(notifData.notifications);
        setUnreadCount(countData.count);
      } catch {
        // Silently fail — notifications are non-critical
      }
    };

    fetchData();
  }, [setNotifications, setUnreadCount]);

  // Listen for new notifications via socket
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: {
      id: string;
      type: string;
      title: string;
      body: string;
      data?: unknown;
    }) => {
      const notification: AppNotification = {
        id: data.id,
        userId: '',
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data as Record<string, unknown> | null,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      addNotification(notification);

      // Play sound if tab is not focused
      if (document.hidden) {
        try {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch {
          // Audio play failed — ignore
        }
      }
    };

    socket.on(SOCKET_EVENTS.NEW_NOTIFICATION, handleNewNotification);
    return () => {
      socket.off(SOCKET_EVENTS.NEW_NOTIFICATION, handleNewNotification);
    };
  }, [socket, addNotification]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      markRead(id);
      try {
        await api.patch(`/api/notifications/${id}/read`, {});
      } catch {
        // Ignore
      }
    },
    [markRead],
  );

  const handleMarkAllRead = useCallback(async () => {
    markAllRead();
    try {
      await api.post('/api/notifications/read-all');
    } catch {
      // Ignore
    }
  }, [markAllRead]);

  return {
    notifications,
    unreadCount,
    markRead: handleMarkRead,
    markAllRead: handleMarkAllRead,
  };
}
