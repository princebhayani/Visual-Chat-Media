'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useChatStore } from '@/store/chat-store';
import { useMessageStore } from '@/store/message-store';
import toast from 'react-hot-toast';
import type { Conversation } from '@ai-chat/shared';

export function useConversations() {
  const router = useRouter();
  const {
    conversations,
    isLoadingConversations,
    searchQuery,
    setConversations,
    addConversation,
    removeConversation,
    setActiveConversation,
    updateConversation,
  } = useChatStore();
  const { clearMessages } = useMessageStore();

  const fetchConversations = useCallback(async () => {
    try {
      const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const data = await api.get<Conversation[]>(`/api/conversations${params}`);
      setConversations(data);
    } catch {
      toast.error('Failed to load conversations');
    }
  }, [searchQuery, setConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = useCallback(async () => {
    try {
      const conversation = await api.post<Conversation>('/api/conversations', {});
      addConversation(conversation);
      setActiveConversation(conversation.id);
      router.push(`/chat/${conversation.id}`);
      return conversation;
    } catch {
      toast.error('Failed to create conversation');
      return null;
    }
  }, [addConversation, setActiveConversation, router]);

  const deleteConversationById = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/api/conversations/${id}`);
        removeConversation(id);
        clearMessages(id);
        toast.success('Conversation deleted');
        router.push('/chat');
      } catch {
        toast.error('Failed to delete conversation');
      }
    },
    [removeConversation, clearMessages, router],
  );

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      try {
        await api.patch(`/api/conversations/${id}`, { title });
        updateConversation(id, { title });
      } catch {
        toast.error('Failed to rename conversation');
      }
    },
    [updateConversation],
  );

  const togglePin = useCallback(
    async (id: string, isPinned: boolean) => {
      try {
        await api.patch(`/api/conversations/${id}/pin`, { isPinned: !isPinned });
        updateConversation(id, { isPinned: !isPinned });
      } catch {
        toast.error('Failed to update conversation');
      }
    },
    [updateConversation],
  );

  return {
    conversations,
    isLoadingConversations,
    createConversation,
    deleteConversation: deleteConversationById,
    renameConversation,
    togglePin,
    refetch: fetchConversations,
  };
}
