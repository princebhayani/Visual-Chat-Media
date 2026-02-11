export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'SYSTEM' | 'AI_RESPONSE';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface Attachment {
  id: string;
  messageId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: string;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  conversationId: string;
  senderId: string | null;
  replyToId: string | null;
  replyTo?: Message | null;
  attachments?: Attachment[];
  reactions?: Reaction[];
  isEdited: boolean;
  isDeleted: boolean;
  tokenCount: number | null;
  createdAt: string;
}

export interface StreamingMessage {
  id: string;
  content: string;
  type: 'AI_RESPONSE';
  conversationId: string;
  isStreaming: boolean;
}

// Legacy compat: keep MessageRole for backward-compat during transition
export type MessageRole = 'user' | 'assistant';
