import type { Message } from './message';
import type { ConversationMember } from './conversation';

export interface ClientToServerEvents {
  // Conversation management
  'join-conversation': (conversationId: string) => void;
  'leave-conversation': (conversationId: string) => void;

  // Messaging
  'send-message': (data: {
    conversationId: string;
    content: string;
    type?: string;
    replyToId?: string;
    attachments?: { fileUrl: string; fileName: string; fileSize: number; mimeType: string }[];
  }) => void;
  'edit-message': (data: { messageId: string; conversationId: string; content: string }) => void;
  'delete-message': (data: { messageId: string; conversationId: string }) => void;
  'message-reaction': (data: { messageId: string; conversationId: string; emoji: string }) => void;

  // AI
  'stop-generation': (data: { conversationId: string }) => void;
  'regenerate-response': (data: { conversationId: string }) => void;

  // Typing
  'typing-start': (conversationId: string) => void;
  'typing-stop': (conversationId: string) => void;

  // Message status
  'message-delivered': (data: { messageId: string; conversationId: string }) => void;
  'message-read': (data: { conversationId: string }) => void;

  // Calls
  'call-initiate': (data: { conversationId: string; calleeId: string; type: 'AUDIO' | 'VIDEO' }) => void;
  'call-accept': (data: { callId: string }) => void;
  'call-reject': (data: { callId: string }) => void;
  'call-end': (data: { callId: string }) => void;
  'call-ice-candidate': (data: { callId: string; candidate: unknown }) => void;
  'call-offer': (data: { callId: string; offer: unknown }) => void;
  'call-answer': (data: { callId: string; answer: unknown }) => void;
}

export interface ServerToClientEvents {
  // Messaging
  'new-message': (message: Message) => void;
  'message-deleted': (data: { conversationId: string; messageId: string }) => void;
  'message-updated': (message: Message) => void;
  'message-reaction-updated': (data: { conversationId: string; messageId: string; reactions: { id: string; userId: string; emoji: string }[] }) => void;

  // AI streaming
  'ai-stream-start': (data: { conversationId: string; messageId: string }) => void;
  'ai-stream-chunk': (data: { conversationId: string; messageId: string; chunk: string }) => void;
  'ai-stream-end': (data: { conversationId: string; messageId: string; fullContent: string }) => void;
  'ai-stream-error': (data: { conversationId: string; error: string }) => void;

  // Conversation updates
  'conversation-updated': (data: { id: string; title: string; [key: string]: unknown }) => void;

  // Typing
  'typing': (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => void;

  // Message status
  'message-status-update': (data: { conversationId: string; messageId: string; status: string }) => void;

  // Presence
  'user-online': (data: { userId: string }) => void;
  'user-offline': (data: { userId: string; lastSeenAt: string }) => void;

  // Group events
  'group-member-added': (data: { conversationId: string; member: ConversationMember }) => void;
  'group-member-removed': (data: { conversationId: string; userId: string }) => void;
  'group-updated': (data: { conversationId: string; [key: string]: unknown }) => void;

  // Calls
  'call-ringing': (data: { callId: string; callerId: string; callerName: string; conversationId: string; type: 'AUDIO' | 'VIDEO' }) => void;
  'call-accepted': (data: { callId: string }) => void;
  'call-rejected': (data: { callId: string }) => void;
  'call-ended': (data: { callId: string }) => void;
  'call-ice-candidate': (data: { callId: string; candidate: unknown }) => void;
  'call-offer': (data: { callId: string; offer: unknown }) => void;
  'call-answer': (data: { callId: string; answer: unknown }) => void;

  // Notifications
  'new-notification': (data: { id: string; type: string; title: string; body: string; data?: unknown }) => void;

  // Error
  'error': (data: { message: string }) => void;
}
