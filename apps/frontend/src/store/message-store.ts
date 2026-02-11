import { create } from 'zustand';
import type { Message, StreamingMessage } from '@ai-chat/shared';

interface MessageState {
  messages: Record<string, Message[]>;
  streamingMessage: StreamingMessage | null;
  isStreaming: boolean;
  loadingConversations: Set<string>;

  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  updateMessage: (conversationId: string, message: Message) => void;
  clearMessages: (conversationId: string) => void;

  setStreamingMessage: (message: StreamingMessage | null) => void;
  appendStreamChunk: (chunk: string) => void;
  finalizeStream: (messageId: string, fullContent: string) => void;
  setIsStreaming: (value: boolean) => void;

  setLoadingConversation: (conversationId: string, loading: boolean) => void;
  isConversationLoading: (conversationId: string) => boolean;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  streamingMessage: null,
  isStreaming: false,
  loadingConversations: new Set(),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [
          ...(state.messages[conversationId] || []),
          message,
        ],
      },
    })),

  removeMessage: (conversationId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).filter(
          (m) => m.id !== messageId,
        ),
      },
    })),

  updateMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === message.id ? message : m,
        ),
      },
    })),

  clearMessages: (conversationId) =>
    set((state) => {
      const { [conversationId]: _, ...rest } = state.messages;
      return { messages: rest };
    }),

  setStreamingMessage: (message) => set({ streamingMessage: message }),

  appendStreamChunk: (chunk) =>
    set((state) => {
      if (!state.streamingMessage) return state;
      return {
        streamingMessage: {
          ...state.streamingMessage,
          content: state.streamingMessage.content + chunk,
        },
      };
    }),

  finalizeStream: (messageId, fullContent) => {
    const state = get();
    if (!state.streamingMessage) return;

    const conversationId = state.streamingMessage.conversationId;
    const finalMessage: Message = {
      id: messageId,
      content: fullContent,
      type: 'AI_RESPONSE',
      status: 'SENT',
      conversationId,
      senderId: null,
      replyToId: null,
      isEdited: false,
      isDeleted: false,
      tokenCount: null,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      streamingMessage: null,
      isStreaming: false,
      messages: {
        ...s.messages,
        [conversationId]: [
          ...(s.messages[conversationId] || []),
          finalMessage,
        ],
      },
    }));
  },

  setIsStreaming: (value) => set({ isStreaming: value }),

  setLoadingConversation: (conversationId, loading) =>
    set((state) => {
      const next = new Set(state.loadingConversations);
      if (loading) next.add(conversationId);
      else next.delete(conversationId);
      return { loadingConversations: next };
    }),

  isConversationLoading: (conversationId) => get().loadingConversations.has(conversationId),
}));
