import { create } from 'zustand';
import type { Conversation } from '@ai-chat/shared';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoadingConversations: boolean;
  searchQuery: string;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  setLoadingConversations: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  isLoadingConversations: true,
  searchQuery: '',

  setConversations: (conversations) => set({ conversations, isLoadingConversations: false }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  updateConversation: (id, data) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...data } : c,
      ),
    })),

  setLoadingConversations: (isLoadingConversations) => set({ isLoadingConversations }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
