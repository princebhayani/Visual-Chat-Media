'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, RefreshCw, Bot, User, Pencil, Trash2, Reply, Smile } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MarkdownRenderer } from './markdown-renderer';
import { MessageStatusIcon } from './message-status-icon';
import { ReactionPicker } from './reaction-picker';
import { ReactionDisplay } from './reaction-display';
import { ReplyPreview } from './reply-preview';
import { FileAttachment } from './file-attachment';
import { useClipboard } from '@/hooks/use-clipboard';
import { useAuthStore } from '@/store/auth-store';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Message, ConversationType } from '@ai-chat/shared';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamContent?: string;
  onRegenerate?: () => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  userAvatar?: string | null;
  userName?: string;
  conversationType?: ConversationType;
}

export function MessageBubble({
  message,
  isStreaming,
  streamContent,
  onRegenerate,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  userAvatar,
  userName,
  conversationType,
}: MessageBubbleProps) {
  const currentUser = useAuthStore((s) => s.user);
  const isOwnMessage = message.senderId === currentUser?.id;
  const isAI = message.type === 'AI_RESPONSE';
  const isUserMsg = message.type === 'TEXT' && message.senderId !== null;
  const { copy, hasCopied } = useClipboard();
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const content = isStreaming ? (streamContent || '') : message.content;

  // Deleted message display
  if (message.isDeleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex gap-3 px-4 py-3',
          isOwnMessage ? 'flex-row-reverse' : 'flex-row',
        )}
      >
        <div className="rounded-2xl px-4 py-2.5 bg-muted/30 border border-dashed border-border/50">
          <p className="text-sm text-muted-foreground italic">This message was deleted</p>
        </div>
      </motion.div>
    );
  }

  // Determine sender name for multi-user conversations
  const showSenderName =
    !isOwnMessage && !isAI && conversationType && conversationType !== 'AI_CHAT';
  const senderDisplayName = userName || 'Unknown';
  const avatarSide = isOwnMessage ? 'flex-row-reverse' : 'flex-row';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false); }}
      className={cn(
        'group flex gap-3 px-4 py-4 transition-colors duration-200',
        avatarSide,
        showActions && 'bg-accent/20',
      )}
    >
      {/* Avatar */}
      <Avatar className={cn('h-8 w-8 shrink-0 shadow-sm', isStreaming && 'animate-sparkle')}>
        {isOwnMessage && userAvatar ? (
          <AvatarImage src={userAvatar} alt={userName} />
        ) : null}
        <AvatarFallback
          className={cn(
            'text-xs font-medium',
            isAI
              ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white'
              : isOwnMessage
                ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                : 'bg-gradient-to-br from-orange-500 to-pink-500 text-white',
          )}
        >
          {isAI ? (
            <Bot className="h-4 w-4" />
          ) : isOwnMessage ? (
            userName ? userName.charAt(0).toUpperCase() : <User className="h-4 w-4" />
          ) : (
            senderDisplayName.charAt(0).toUpperCase()
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn('max-w-[80%] min-w-0', isOwnMessage ? 'items-end' : 'items-start')}>
        {/* Sender name for group/DM */}
        {showSenderName && (
          <p className="text-[11px] font-semibold text-muted-foreground mb-0.5 px-1">
            {senderDisplayName}
          </p>
        )}

        {/* Reply-to preview */}
        {message.replyTo && (
          <div className="mb-1">
            <ReplyPreview message={message.replyTo as Message} compact />
          </div>
        )}

        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 shadow-sm',
            isOwnMessage
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-tr-sm'
              : 'bg-muted/60 backdrop-blur-sm border border-border/30 rounded-tl-sm',
          )}
        >
          {isAI ? (
            <MarkdownRenderer content={content} />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
          )}
          {isStreaming && (
            <span className="inline-block h-4 w-0.5 animate-pulse bg-current ml-0.5 align-middle" />
          )}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.attachments.map((attachment) => (
              <FileAttachment key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && onReaction && (
          <ReactionDisplay
            reactions={message.reactions}
            onToggle={(emoji) => onReaction(message.id, emoji)}
          />
        )}

        {/* Meta info + actions */}
        <div className={cn('flex items-center gap-1 mt-1 px-1', isOwnMessage ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(message.createdAt)}
            {message.isEdited && ' (edited)'}
          </span>

          {/* Message status (own messages only) */}
          {isOwnMessage && isUserMsg && <MessageStatusIcon status={message.status} />}

          {/* Action buttons */}
          {showActions && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-0.5 ml-1"
            >
              {onReaction && (
                <div className="relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); setShowReactionPicker(!showReactionPicker); }}
                      >
                        <Smile className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>React</TooltipContent>
                  </Tooltip>
                  <AnimatePresence>
                    {showReactionPicker && (
                      <div className="absolute bottom-full mb-1 left-0 z-50">
                        <ReactionPicker
                          onSelect={(emoji) => { onReaction(message.id, emoji); setShowReactionPicker(false); }}
                        />
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {onReply && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon-sm" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onReply(message); }}>
                      <Reply className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reply</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="ghost" className="h-6 w-6" onClick={() => copy(message.content)}>
                    {hasCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy</TooltipContent>
              </Tooltip>

              {isAI && onRegenerate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon-sm" variant="ghost" className="h-6 w-6" onClick={onRegenerate}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Regenerate</TooltipContent>
                </Tooltip>
              )}

              {isOwnMessage && onEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon-sm" variant="ghost" className="h-6 w-6" onClick={() => onEdit(message.id, message.content)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              )}

              {isOwnMessage && onDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDelete(message.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
