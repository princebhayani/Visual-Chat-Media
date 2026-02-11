'use client';

import { useEffect } from 'react';
import { useSocket } from './use-socket';
import { useMessageStore } from '@/store/message-store';
import { SOCKET_EVENTS } from '@ai-chat/shared';

export function useMessageStatus(conversationId: string) {
  const { socket } = useSocket();
  const { messages, updateMessage } = useMessageStore();

  // Listen for message status updates
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data: {
      conversationId: string;
      messageId: string;
      status: string;
    }) => {
      if (data.conversationId !== conversationId) return;

      const conversationMessages = messages[conversationId] || [];

      if (data.messageId === '') {
        // Empty messageId means all messages in conversation updated
        for (const msg of conversationMessages) {
          if (msg.status !== data.status) {
            updateMessage(conversationId, { ...msg, status: data.status as any });
          }
        }
      } else {
        const msg = conversationMessages.find((m) => m.id === data.messageId);
        if (msg) {
          updateMessage(conversationId, { ...msg, status: data.status as any });
        }
      }
    };

    socket.on(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, handleStatusUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [socket, conversationId, messages, updateMessage]);

  // Emit message read when conversation is opened
  useEffect(() => {
    if (!socket) return;

    socket.emit(SOCKET_EVENTS.MESSAGE_READ, { conversationId });
  }, [socket, conversationId]);
}
