'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from './message-bubble';
import { SystemMessage } from './system-message';
import { StreamingIndicator } from './streaming-indicator';
import { useAuthStore } from '@/store/auth-store';
import type { Message, StreamingMessage, ConversationType } from '@ai-chat/shared';

interface MessageListProps {
  messages: Message[];
  streamingMessage: StreamingMessage | null;
  isLoading: boolean;
  isStreaming: boolean;
  onRegenerate: () => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (message: Message) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  conversationType?: ConversationType;
}

export function MessageList({
  messages,
  streamingMessage,
  isLoading,
  isStreaming,
  onRegenerate,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
  onReaction,
  conversationType,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const user = useAuthStore((s) => s.user);

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, streamingMessage?.content]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = el;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-[60%]' : 'w-[40%]'} rounded-2xl`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin relative">
      <div className="mx-auto max-w-3xl py-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => {
            // System messages render differently
            if (message.type === 'SYSTEM') {
              return <SystemMessage key={message.id} message={message} />;
            }

            const isLastAI =
              message.type === 'AI_RESPONSE' && index === messages.length - 1;
            const isOwnMessage = message.senderId === user?.id;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                onRegenerate={isLastAI ? onRegenerate : undefined}
                onEdit={isOwnMessage ? onEditMessage : undefined}
                onDelete={isOwnMessage ? onDeleteMessage : undefined}
                onReply={onReplyMessage}
                onReaction={onReaction}
                userAvatar={user?.avatarUrl}
                userName={user?.name}
                conversationType={conversationType}
              />
            );
          })}
        </AnimatePresence>

        {/* Streaming message */}
        {streamingMessage && (
          <MessageBubble
            message={{
              id: streamingMessage.id,
              content: '',
              type: 'AI_RESPONSE',
              status: 'SENT',
              conversationId: streamingMessage.conversationId,
              senderId: null,
              replyToId: null,
              isEdited: false,
              isDeleted: false,
              tokenCount: null,
              createdAt: new Date().toISOString(),
            }}
            isStreaming
            streamContent={streamingMessage.content}
          />
        )}

        {isStreaming && !streamingMessage?.content && <StreamingIndicator />}

        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="sticky bottom-4 flex justify-center pointer-events-none"
          >
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full shadow-lg pointer-events-auto"
              onClick={() => scrollToBottom()}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
