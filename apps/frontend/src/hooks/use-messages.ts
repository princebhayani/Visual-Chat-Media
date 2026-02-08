'use client';

import { useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useMessageStore } from '@/store/message-store';
import { useSocket } from './use-socket';
import { SOCKET_EVENTS } from '@ai-chat/shared';
import type { Message, Reaction } from '@ai-chat/shared';
import type { ConversationWithMessages } from '@ai-chat/shared';

export function useMessages(conversationId: string) {
  const { socket } = useSocket();
  const {
    messages,
    setMessages,
    addMessage,
    removeMessage,
    updateMessage,
    setLoadingConversation,
  } = useMessageStore();

  const conversationMessages = messages[conversationId] || [];
  const isLoading = useMessageStore((s) => s.isConversationLoading(conversationId));

  const fetchMessages = useCallback(async () => {
    if (messages[conversationId]) return;

    setLoadingConversation(conversationId, true);
    try {
      const data = await api.get<ConversationWithMessages>(
        `/api/conversations/${conversationId}`,
      );
      setMessages(conversationId, data.messages);
    } catch {
      // Silently fail
    } finally {
      setLoadingConversation(conversationId, false);
    }
  }, [conversationId, messages, setMessages, setLoadingConversation]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        addMessage(conversationId, message);
      }
    };

    const handleMessageDeleted = (data: { conversationId: string; messageId: string }) => {
      if (data.conversationId === conversationId) {
        removeMessage(conversationId, data.messageId);
      }
    };

    const handleMessageUpdated = (message: Message) => {
      if (message.conversationId === conversationId) {
        updateMessage(conversationId, message);
      }
    };

    const handleReactionUpdated = (data: {
      conversationId: string;
      messageId: string;
      reactions: { id: string; userId: string; emoji: string }[];
    }) => {
      if (data.conversationId === conversationId) {
        const msg = (messages[conversationId] || []).find((m) => m.id === data.messageId);
        if (msg) {
          // Map to full Reaction type
          const fullReactions: Reaction[] = data.reactions.map((r) => ({
            ...r,
            messageId: data.messageId,
            createdAt: new Date().toISOString(),
          }));
          updateMessage(conversationId, { ...msg, reactions: fullReactions });
        }
      }
    };

    const handleStatusUpdate = (data: {
      conversationId: string;
      messageId: string;
      status: string;
    }) => {
      if (data.conversationId === conversationId) {
        const conversationMsgs = messages[conversationId] || [];
        if (data.messageId === '') {
          // All messages in conversation
          for (const msg of conversationMsgs) {
            if (msg.status !== data.status) {
              updateMessage(conversationId, { ...msg, status: data.status as any });
            }
          }
        } else {
          const msg = conversationMsgs.find((m) => m.id === data.messageId);
          if (msg) {
            updateMessage(conversationId, { ...msg, status: data.status as any });
          }
        }
      }
    };

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
    socket.on(SOCKET_EVENTS.MESSAGE_UPDATED, handleMessageUpdated);
    socket.on(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, handleReactionUpdated);
    socket.on(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, handleStatusUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
      socket.off(SOCKET_EVENTS.MESSAGE_UPDATED, handleMessageUpdated);
      socket.off(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, handleReactionUpdated);
      socket.off(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [socket, conversationId, addMessage, removeMessage, updateMessage, messages]);

  return {
    messages: conversationMessages,
    isLoading,
    refetch: fetchMessages,
  };
}
