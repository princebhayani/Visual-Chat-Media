'use client';

import { useEffect, useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { EmptyState } from '@/components/chat/empty-state';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ConversationHeader } from '@/components/chat/conversation-header';
import { useMessages } from '@/hooks/use-messages';
import { useStreaming } from '@/hooks/use-streaming';
import { useSocket } from '@/hooks/use-socket';
import { useTyping } from '@/hooks/use-typing';
import { useChatStore } from '@/store/chat-store';
import { SOCKET_EVENTS } from '@ai-chat/shared';
import type { Message, ConversationType } from '@ai-chat/shared';

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { messages, isLoading } = useMessages(conversationId);
  const { streamingMessage, isStreaming, stopGeneration } = useStreaming(conversationId);
  const { socket } = useSocket();
  const { setActiveConversation, conversations } = useChatStore();
  const { typingUsers, emitTyping, stopTyping } = useTyping(conversationId);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  // Get conversation type
  const conversation = conversations.find((c) => c.id === conversationId);
  const conversationType: ConversationType = conversation?.type || 'AI_CHAT';

  // Set active conversation and join socket room
  useEffect(() => {
    setActiveConversation(conversationId);

    if (socket) {
      socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversationId);
      // Mark messages as read
      socket.emit(SOCKET_EVENTS.MESSAGE_READ, { conversationId });
      return () => {
        socket.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, conversationId);
      };
    }
  }, [conversationId, socket, setActiveConversation]);

  const handleRegenerate = useCallback(() => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.REGENERATE_RESPONSE, { conversationId });
    }
  }, [socket, conversationId]);

  const handleEditMessage = useCallback(
    (messageId: string, content: string) => {
      if (socket) {
        socket.emit(SOCKET_EVENTS.EDIT_MESSAGE, { messageId, conversationId, content });
      }
    },
    [socket, conversationId],
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (socket) {
        socket.emit(SOCKET_EVENTS.DELETE_MESSAGE, { messageId, conversationId });
      }
    },
    [socket, conversationId],
  );

  const handleReplyMessage = useCallback((message: Message) => {
    setReplyToMessage(message);
  }, []);

  const handleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (socket) {
        socket.emit(SOCKET_EVENTS.MESSAGE_REACTION, { messageId, conversationId, emoji });
      }
    },
    [socket, conversationId],
  );

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  const showEmptyState = !isLoading && messages.length === 0 && !streamingMessage;

  return (
    <div className="flex h-full flex-col">
      {/* Conversation Header */}
      <ConversationHeader
        conversation={conversation}
        conversationType={conversationType}
      />

      {showEmptyState ? (
        <EmptyState conversationId={conversationId} conversationType={conversationType} />
      ) : (
        <MessageList
          messages={messages}
          streamingMessage={streamingMessage}
          isLoading={isLoading}
          isStreaming={isStreaming}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onReplyMessage={handleReplyMessage}
          onReaction={handleReaction}
          conversationType={conversationType}
        />
      )}
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput
        conversationId={conversationId}
        isStreaming={isStreaming}
        onStop={stopGeneration}
        replyToMessage={replyToMessage}
        onCancelReply={handleCancelReply}
        onTyping={emitTyping}
      />
    </div>
  );
}
