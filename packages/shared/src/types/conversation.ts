import type { Message } from './message';

export type ConversationType = 'DIRECT' | 'GROUP' | 'AI_CHAT';
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    email: string;
    isOnline: boolean;
  };
  role: MemberRole;
  isPinned: boolean;
  isMuted: boolean;
  lastReadAt: string | null;
  joinedAt: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string;
  groupName: string | null;
  groupAvatar: string | null;
  description: string | null;
  systemPrompt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  members?: ConversationMember[];
  isPinned?: boolean;    // Computed per-member from ConversationMember
  lastMessage?: Message;
  messageCount?: number;
  unreadCount?: number;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}
