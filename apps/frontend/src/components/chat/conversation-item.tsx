'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquare, Pencil, Trash2, Pin, PinOff, Check, X, Bot, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';
import { useUserStore } from '@/store/user-store';
import { useAuthStore } from '@/store/auth-store';
import type { Conversation } from '@ai-chat/shared';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isCollapsed: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  isCollapsed,
  onDelete,
  onRename,
  onTogglePin,
}: ConversationItemProps) {
  const router = useRouter();
  const { setActiveConversation } = useChatStore();
  const { isOnline } = useUserStore();
  const currentUser = useAuthStore((s) => s.user);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [showActions, setShowActions] = useState(false);

  const handleClick = () => {
    setActiveConversation(conversation.id);
    router.push(`/chat/${conversation.id}`);
  };

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      onRename(conversation.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  // Determine conversation icon and display info
  const getConversationIcon = () => {
    switch (conversation.type) {
      case 'DIRECT':
        return <User className="h-4 w-4" />;
      case 'GROUP':
        return <Users className="h-4 w-4" />;
      case 'AI_CHAT':
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  // Get the other user in a DM
  const getDirectChatUser = () => {
    if (conversation.type !== 'DIRECT' || !conversation.members) return null;
    return conversation.members.find((m) => m.userId !== currentUser?.id);
  };

  const directChatUser = getDirectChatUser();
  const displayTitle =
    conversation.type === 'DIRECT' && directChatUser
      ? directChatUser.user?.name || conversation.title
      : conversation.type === 'GROUP' && conversation.groupName
        ? conversation.groupName
        : conversation.title;

  // Online indicator for DMs
  const showOnlineIndicator =
    conversation.type === 'DIRECT' && directChatUser && isOnline(directChatUser.userId);

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 mx-auto my-1',
              isActive
                ? 'bg-primary/20 text-primary glow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {getConversationIcon()}
            {showOnlineIndicator && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500 ring-1 ring-background" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{displayTitle}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={cn(
        'group relative flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-all duration-200',
        isActive ? 'bg-accent/80 shadow-sm' : 'hover:bg-accent/50',
      )}
      onClick={isEditing ? undefined : handleClick}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeConversation"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-violet-500 to-cyan-500"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}

      {/* Conversation type icon with online indicator */}
      <div className="relative shrink-0">
        <div className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center',
          conversation.type === 'AI_CHAT' ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-600 dark:text-emerald-400' :
          conversation.type === 'DIRECT' ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400' :
          'bg-gradient-to-br from-orange-500/20 to-pink-500/20 text-orange-600 dark:text-orange-400',
        )}>
          {getConversationIcon()}
        </div>
        {showOnlineIndicator && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
        )}
      </div>

      {/* Pin indicator */}
      {(conversation.isPinned ?? false) && (
        <Pin className="h-3 w-3 shrink-0 text-primary" />
      )}

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-6 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <Button size="icon-sm" variant="ghost" onClick={handleRename}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setIsEditing(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <p className={cn('truncate text-sm font-medium', conversation.unreadCount && conversation.unreadCount > 0 && 'font-bold')}>
                {truncate(displayTitle, 40)}
              </p>
              {conversation.unreadCount && conversation.unreadCount > 0 ? (
                <span className="shrink-0 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </span>
              ) : null}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {conversation.lastMessage
                ? truncate(conversation.lastMessage.content, 50)
                : 'No messages yet'}
            </p>
          </>
        )}
      </div>

      {/* Timestamp and actions */}
      {!isEditing && (
        <div className="flex items-center gap-0.5 shrink-0">
          {showActions ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="icon-sm"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => onTogglePin(conversation.id, conversation.isPinned ?? false)}
              >
                {conversation.isPinned ? (
                  <PinOff className="h-3 w-3" />
                ) : (
                  <Pin className="h-3 w-3" />
                )}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  setEditTitle(conversation.title);
                  setIsEditing(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => onDelete(conversation.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(conversation.updatedAt)}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
