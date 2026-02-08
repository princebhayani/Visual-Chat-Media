import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import * as chatService from './chat.service';
import { asyncHandler } from '../../lib/async-handler';
import { getIO } from '../../lib/socket-io';
import { SOCKET_EVENTS } from '@ai-chat/shared';

// ─── Helper: format message for API response ─────────────────────────────────

function formatMessage(m: any) {
  return {
    id: m.id,
    content: m.content,
    type: m.type,
    status: m.status,
    conversationId: m.conversationId,
    senderId: m.senderId,
    sender: m.sender || null,
    replyToId: m.replyToId || null,
    replyTo: m.replyTo || null,
    attachments: m.attachments || [],
    reactions: m.reactions || [],
    isEdited: m.isEdited,
    isDeleted: m.isDeleted,
    tokenCount: m.tokenCount,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  };
}

function formatConversation(c: any) {
  return {
    id: c.id,
    type: c.type,
    title: c.title,
    groupName: c.groupName,
    groupAvatar: c.groupAvatar,
    description: c.description,
    systemPrompt: c.systemPrompt,
    createdById: c.createdById,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
    members: c.members?.map((m: any) => ({
      id: m.id,
      conversationId: m.conversationId,
      userId: m.userId,
      user: m.user,
      role: m.role,
      isPinned: m.isPinned,
      isMuted: m.isMuted,
      lastReadAt: m.lastReadAt instanceof Date ? m.lastReadAt.toISOString() : (m.lastReadAt || null),
      joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : m.joinedAt,
    })) || [],
  };
}

// ─── ENDPOINTS ────────────────────────────────────────────────────────────────

export const listConversations = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const search = req.query.search as string | undefined;
  const conversations = await chatService.listConversations(userId, search);

  const formatted = conversations.map((c) => ({
    ...formatConversation(c),
    isPinned: c.isPinned,
    lastMessage: c.messages[0]
      ? {
          id: c.messages[0].id,
          content: c.messages[0].content,
          type: c.messages[0].type,
          status: c.messages[0].status,
          senderId: c.messages[0].senderId,
          conversationId: c.id,
          isEdited: false,
          isDeleted: false,
          tokenCount: null,
          replyToId: null,
          createdAt: c.messages[0].createdAt instanceof Date
            ? c.messages[0].createdAt.toISOString()
            : c.messages[0].createdAt,
        }
      : undefined,
    messageCount: c.messageCount,
    unreadCount: c.unreadCount,
  }));

  res.json(formatted);
});

export const createConversation = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const conversation = await chatService.createConversation(userId, req.body);
  res.status(201).json(formatConversation(conversation));
});

export const getConversation = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const id = req.params.id as string;
  const conversation = await chatService.getConversation(id, userId);

  res.json({
    ...formatConversation(conversation),
    messages: conversation.messages.map(formatMessage),
  });
});

export const updateConversation = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const id = req.params.id as string;
  const conversation = await chatService.updateConversation(id, userId, req.body);

  const result = {
    id: conversation.id,
    type: conversation.type,
    title: conversation.title,
    groupName: conversation.groupName,
    description: conversation.description,
    systemPrompt: conversation.systemPrompt,
    createdById: conversation.createdById,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };

  // Emit socket event for group updates
  if (conversation.type === 'GROUP') {
    const io = getIO();
    io.to(`conversation:${id}`).emit(SOCKET_EVENTS.GROUP_UPDATED, {
      conversationId: id,
      groupName: conversation.groupName,
      description: conversation.description,
    });
  }

  res.json(result);
});

export const deleteConversation = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const id = req.params.id as string;
  await chatService.deleteConversation(id, userId);
  res.status(204).send();
});

export const togglePin = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const id = req.params.id as string;
  const { isPinned } = req.body;
  await chatService.togglePin(id, userId, isPinned);
  res.json({ isPinned });
});

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const cursor = req.query.cursor as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const conversationId = req.params.id as string;
  const messages = await chatService.getMessages(conversationId, userId, cursor, limit);

  res.json(messages.map(formatMessage));
});

export const exportConversation = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const format = (req.query.format as 'json' | 'markdown') || 'markdown';
  const id = req.params.id as string;
  const result = await chatService.exportConversation(id, userId, format);

  if (format === 'markdown') {
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="conversation.md"');
    res.send(result);
  } else {
    res.json(result);
  }
});

// ─── GROUP MANAGEMENT ─────────────────────────────────────────────────────────

export const addGroupMember = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const conversationId = req.params.id as string;
  const { userId: targetUserId } = req.body;
  const member = await chatService.addGroupMember(conversationId, userId, targetUserId);

  // Emit socket events
  const io = getIO();
  io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.GROUP_MEMBER_ADDED, {
    conversationId,
    member: {
      id: member.id,
      conversationId: member.conversationId,
      userId: member.userId,
      user: member.user,
      role: member.role as 'OWNER' | 'ADMIN' | 'MEMBER',
      isPinned: false,
      isMuted: false,
      lastReadAt: null,
      joinedAt: new Date().toISOString(),
    },
  });
  // Also notify the new member's personal room so they see the conversation
  io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.GROUP_MEMBER_ADDED, {
    conversationId,
    member: {
      id: member.id,
      conversationId: member.conversationId,
      userId: member.userId,
      user: member.user,
      role: member.role as 'OWNER' | 'ADMIN' | 'MEMBER',
      isPinned: false,
      isMuted: false,
      lastReadAt: null,
      joinedAt: new Date().toISOString(),
    },
  });

  res.status(201).json(member);
});

export const removeGroupMember = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const conversationId = req.params.id as string;
  const targetUserId = req.params.userId as string;
  await chatService.removeGroupMember(conversationId, userId, targetUserId);

  // Emit socket events
  const io = getIO();
  io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.GROUP_MEMBER_REMOVED, {
    conversationId,
    userId: targetUserId,
  });
  // Also notify the removed user
  io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.GROUP_MEMBER_REMOVED, {
    conversationId,
    userId: targetUserId,
  });

  res.status(204).send();
});

export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const conversationId = req.params.id as string;
  const targetUserId = req.params.userId as string;
  const { role } = req.body;
  await chatService.updateMemberRole(conversationId, userId, targetUserId, role);

  // Emit socket event for group update
  const io = getIO();
  io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.GROUP_UPDATED, {
    conversationId,
    updatedMember: { userId: targetUserId, role },
  });

  res.json({ role });
});
