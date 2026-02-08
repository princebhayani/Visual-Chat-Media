import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
  conversationId: z.string().uuid('Invalid conversation ID'),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'SYSTEM', 'AI_RESPONSE']).optional().default('TEXT'),
  replyToId: z.string().uuid('Invalid reply message ID').optional(),
});

export const editMessageSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
  content: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
