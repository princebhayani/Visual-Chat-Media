'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './use-socket';
import { SOCKET_EVENTS } from '@ai-chat/shared';

interface TypingUser {
  userId: string;
  userName: string;
}

export function useTyping(conversationId: string) {
  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Listen for typing events from others
  useEffect(() => {
    if (!socket) return;

    const handleTyping = (data: {
      conversationId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (data.conversationId !== conversationId) return;

      setTypingUsers((prev) => {
        if (data.isTyping) {
          // Add user if not already typing
          if (prev.some((u) => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, userName: data.userName }];
        } else {
          // Remove user
          return prev.filter((u) => u.userId !== data.userId);
        }
      });
    };

    socket.on(SOCKET_EVENTS.TYPING, handleTyping);

    return () => {
      socket.off(SOCKET_EVENTS.TYPING, handleTyping);
    };
  }, [socket, conversationId]);

  // Clear typing users after 3 seconds of no update (safety net)
  useEffect(() => {
    if (typingUsers.length === 0) return;

    const timeout = setTimeout(() => {
      setTypingUsers([]);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [typingUsers]);

  // Emit typing events
  const emitTyping = useCallback(() => {
    if (!socket) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit(SOCKET_EVENTS.TYPING_START, conversationId);
    }

    // Reset the stop timer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit(SOCKET_EVENTS.TYPING_STOP, conversationId);
    }, 2000);
  }, [socket, conversationId]);

  const stopTyping = useCallback(() => {
    if (!socket || !isTypingRef.current) return;

    isTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit(SOCKET_EVENTS.TYPING_STOP, conversationId);
  }, [socket, conversationId]);

  return { typingUsers, emitTyping, stopTyping };
}
