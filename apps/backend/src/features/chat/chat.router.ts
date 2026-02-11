import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import {
  createConversationSchema,
  updateConversationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from '@ai-chat/shared';
import * as chatController from './chat.controller';
import * as aiController from '../ai/ai.controller';

export const chatRouter = Router();

// Conversation CRUD
chatRouter.get('/', chatController.listConversations);
chatRouter.post('/', validate(createConversationSchema), chatController.createConversation);
chatRouter.get('/:id', chatController.getConversation);
chatRouter.patch('/:id', validate(updateConversationSchema), chatController.updateConversation);
chatRouter.delete('/:id', chatController.deleteConversation);

// Pinning (per-member)
chatRouter.patch('/:id/pin', chatController.togglePin);

// Messages
chatRouter.get('/:id/messages', chatController.getMessages);

// Export
chatRouter.get('/:id/export', chatController.exportConversation);

// AI features
chatRouter.post('/:id/summarize', aiController.summarizeConversation);
chatRouter.get('/:id/smart-replies', aiController.getSmartReplies);

// Group member management
chatRouter.post('/:id/members', validate(addMemberSchema), chatController.addGroupMember);
chatRouter.delete('/:id/members/:userId', chatController.removeGroupMember);
chatRouter.patch('/:id/members/:userId/role', validate(updateMemberRoleSchema), chatController.updateMemberRole);
