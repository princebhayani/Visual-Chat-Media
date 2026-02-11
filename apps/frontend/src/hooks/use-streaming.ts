'use client';

import { useEffect, useCallback, useState } from 'react';
import { useMessageStore } from '@/store/message-store';
import { useSocket } from './use-socket';
import { SOCKET_EVENTS } from '@ai-chat/shared';

export function useStreaming(conversationId: string) {
  const { socket } = useSocket();
  const {
    streamingMessage,
    isStreaming,
    setStreamingMessage,
    appendStreamChunk,
    finalizeStream,
    setIsStreaming,
    addMessage,
  } = useMessageStore();
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleStreamStart = (data: { conversationId: string; messageId: string }) => {
      if (data.conversationId !== conversationId) return;
      setAiError(null);
      setIsStreaming(true);
      setStreamingMessage({
        id: data.messageId,
        content: '',
        type: 'AI_RESPONSE',
        conversationId,
        isStreaming: true,
      });
    };

    const handleStreamChunk = (data: {
      conversationId: string;
      messageId: string;
      chunk: string;
    }) => {
      if (data.conversationId !== conversationId) return;
      appendStreamChunk(data.chunk);
    };

    const handleStreamEnd = (data: {
      conversationId: string;
      messageId: string;
      fullContent: string;
    }) => {
      if (data.conversationId !== conversationId) return;
      finalizeStream(data.messageId, data.fullContent);
    };

    const handleStreamError = (data: { conversationId: string; error: string }) => {
      if (data.conversationId !== conversationId) return;
      setStreamingMessage(null);
      setIsStreaming(false);

      // Show error as a visible AI message in the chat
      const errorMessage = data.error || 'AI failed to respond. Please try again.';
      setAiError(errorMessage);

      // Add an error message to the conversation so the user can see it
      addMessage(conversationId, {
        id: `ai-error-${Date.now()}`,
        content: `⚠️ **AI Error:** ${errorMessage}`,
        type: 'AI_RESPONSE',
        status: 'SENT',
        conversationId,
        senderId: null,
        replyToId: null,
        isEdited: false,
        isDeleted: false,
        tokenCount: null,
        createdAt: new Date().toISOString(),
      });
    };

    socket.on(SOCKET_EVENTS.AI_STREAM_START, handleStreamStart);
    socket.on(SOCKET_EVENTS.AI_STREAM_CHUNK, handleStreamChunk);
    socket.on(SOCKET_EVENTS.AI_STREAM_END, handleStreamEnd);
    socket.on(SOCKET_EVENTS.AI_STREAM_ERROR, handleStreamError);

    return () => {
      socket.off(SOCKET_EVENTS.AI_STREAM_START, handleStreamStart);
      socket.off(SOCKET_EVENTS.AI_STREAM_CHUNK, handleStreamChunk);
      socket.off(SOCKET_EVENTS.AI_STREAM_END, handleStreamEnd);
      socket.off(SOCKET_EVENTS.AI_STREAM_ERROR, handleStreamError);
    };
  }, [socket, conversationId, setStreamingMessage, appendStreamChunk, finalizeStream, setIsStreaming, addMessage, setAiError]);

  const stopGeneration = useCallback(() => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.STOP_GENERATION, { conversationId });
    }
    setStreamingMessage(null);
    setIsStreaming(false);
  }, [socket, conversationId, setStreamingMessage, setIsStreaming]);

  return {
    streamingMessage:
      streamingMessage?.conversationId === conversationId ? streamingMessage : null,
    isStreaming,
    aiError,
    stopGeneration,
  };
}
