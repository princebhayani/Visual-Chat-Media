import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.enum(['DIRECT', 'GROUP', 'AI_CHAT']).optional().default('AI_CHAT'),
  systemPrompt: z.string().max(2000).optional(),
  memberIds: z.array(z.string().uuid()).optional(), // For DIRECT/GROUP
  groupName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  groupName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  systemPrompt: z.string().max(2000).nullable().optional(),
});

export const createGroupSchema = z.object({
  groupName: z.string().min(1, 'Group name is required').max(100),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string().uuid()).min(1, 'At least one member required'),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
