import { Server } from 'socket.io';
import { SOCKET_EVENTS } from '@ai-chat/shared';
import type { ClientToServerEvents, ServerToClientEvents } from '@ai-chat/shared';
import type { AuthenticatedSocket } from './socket.handler';
import {
  saveMessage,
  deleteLastAssistantMessage,
  editMessage,
  softDeleteMessage,
  toggleReaction,
} from '../features/chat/chat.service';
import { streamAIResponse } from '../features/ai/ai.service';
import { prisma } from '../config/database';
import { logger } from '../lib/logger';
import { randomUUID } from 'crypto';
import { getUserSocketIds } from './socket.handler';
import { createNotification } from '../features/notification/notification.service';

// Track active generation abort controllers per conversation
const activeGenerations = new Map<string, AbortController>();

export function chatSocketHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
) {
  socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
    logger.debug(`User ${socket.userId} joined conversation ${conversationId}`);
  });

  socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data) => {
    const { conversationId, content, type, replyToId, attachments } = data;
    await handleSendMessage(io, socket, conversationId, content, type, replyToId, attachments);
  });

  socket.on(SOCKET_EVENTS.STOP_GENERATION, (data) => {
    const controller = activeGenerations.get(data.conversationId);
    if (controller) {
      controller.abort();
      activeGenerations.delete(data.conversationId);
    }
  });

  socket.on(SOCKET_EVENTS.REGENERATE_RESPONSE, async (data) => {
    const { conversationId } = data;
    await handleRegenerate(io, socket, conversationId);
  });

  socket.on(SOCKET_EVENTS.EDIT_MESSAGE, async (data) => {
    const { messageId, conversationId, content } = data;
    await handleEditMessage(io, socket, messageId, conversationId, content);
  });

  socket.on(SOCKET_EVENTS.DELETE_MESSAGE, async (data) => {
    const { messageId, conversationId } = data;
    await handleDeleteMessage(io, socket, messageId, conversationId);
  });

  socket.on(SOCKET_EVENTS.MESSAGE_REACTION, async (data) => {
    const { messageId, conversationId, emoji } = data;
    await handleReaction(io, socket, messageId, conversationId, emoji);
  });

  socket.on(SOCKET_EVENTS.MESSAGE_READ, async (data) => {
    const { conversationId } = data;
    await handleMessageRead(io, socket, conversationId);
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function verifyAccess(conversationId: string, userId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return member;
}

function formatMessageForEmit(msg: any) {
  return {
    id: msg.id,
    content: msg.content,
    type: msg.type,
    status: msg.status,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    sender: msg.sender || null,
    replyToId: msg.replyToId || null,
    replyTo: msg.replyTo || null,
    attachments: msg.attachments || [],
    reactions: msg.reactions || [],
    isEdited: msg.isEdited,
    isDeleted: msg.isDeleted || false,
    tokenCount: msg.tokenCount,
    createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
  };
}

// ─── MESSAGE HANDLERS ─────────────────────────────────────────────────────────

async function handleSendMessage(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
  conversationId: string,
  content: string,
  messageType?: string,
  replyToId?: string,
  attachments?: { fileUrl: string; fileName: string; fileSize: number; mimeType: string }[],
) {
  try {
    // Verify membership
    const member = await verifyAccess(conversationId, socket.userId);
    if (!member) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Conversation not found' });
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Conversation not found' });
      return;
    }

    // Save user message with optional attachments
    const msgType = (messageType as any) || 'TEXT';
    const userMessage = await saveMessage(conversationId, content, msgType, socket.userId, undefined, replyToId, attachments);
    const room = `conversation:${conversationId}`;

    // Broadcast user message
    io.to(room).emit(SOCKET_EVENTS.NEW_MESSAGE, formatMessageForEmit(userMessage));

    // Create notifications for offline members (non-AI chats only)
    if (conversation.type !== 'AI_CHAT') {
      const members = await prisma.conversationMember.findMany({
        where: { conversationId },
        include: { user: { select: { name: true } } },
      });

      type MemberWithUser = { userId: string; user?: { name: string } | null };
      const senderMember = members.find((m: MemberWithUser) => m.userId === socket.userId);
      const senderName = senderMember?.user?.name || 'Someone';

      for (const m of members as MemberWithUser[]) {
        if (m.userId === socket.userId) continue;
        const sockets = getUserSocketIds(m.userId);
        if (sockets.size === 0) {
          // User is offline — create notification
          const notifTitle = conversation.type === 'GROUP'
            ? `${senderName} in ${conversation.groupName || conversation.title}`
            : senderName;
          const notifBody = content.length > 100 ? content.slice(0, 100) + '...' : content;
          createNotification(m.userId, 'NEW_MESSAGE', notifTitle, notifBody, {
            conversationId,
            messageId: userMessage.id,
          }).catch((err) => logger.error('Failed to create notification:', err));
        }
      }

      // Check for @mentions
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        const mentionedName = match[1];
        const mentionedMember = (members as MemberWithUser[]).find(
          (m: MemberWithUser) => m.user?.name?.toLowerCase().includes(mentionedName.toLowerCase()) && m.userId !== socket.userId,
        );
        if (mentionedMember) {
          createNotification(mentionedMember.userId, 'MENTION', `${senderName} mentioned you`, content.length > 100 ? content.slice(0, 100) + '...' : content, {
            conversationId,
            messageId: userMessage.id,
          }).catch((err) => logger.error('Failed to create mention notification:', err));
        }
      }
    }

    // Auto-generate title from first message (AI_CHAT only)
    if (conversation.type === 'AI_CHAT' && conversation.title === 'New Chat') {
      const title = content.length > 80 ? content.slice(0, 80) + '...' : content;
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title },
      });
      io.to(room).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
        id: conversationId,
        title,
      });
    }

    // Stream AI response only for AI_CHAT conversations or @AI mentions
    if (conversation.type === 'AI_CHAT') {
      await streamToClient(io, room, conversationId, content, conversation.systemPrompt);
    } else if (content.toLowerCase().includes('@ai') || content.toLowerCase().startsWith('/ai ')) {
      // AI invocation in non-AI conversations (case-insensitive)
      const aiPrompt = content.replace(/^\/ai\s+/i, '').replace(/@ai\s*/gi, '');
      await streamToClient(io, room, conversationId, aiPrompt, null);
    }
  } catch (error) {
    logger.error('Error handling message:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to process message' });
  }
}

async function handleRegenerate(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
  conversationId: string,
) {
  try {
    // Delete last AI response
    const deleted = await deleteLastAssistantMessage(conversationId, socket.userId);
    const room = `conversation:${conversationId}`;

    if (deleted) {
      io.to(room).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
        conversationId,
        messageId: deleted.id,
      });
    }

    // Get last user message to regenerate from
    const lastUserMessage = await prisma.message.findFirst({
      where: { conversationId, senderId: socket.userId, type: 'TEXT' },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastUserMessage) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'No user message to regenerate from' });
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    await streamToClient(
      io,
      room,
      conversationId,
      lastUserMessage.content,
      conversation?.systemPrompt,
    );
  } catch (error) {
    logger.error('Error regenerating:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to regenerate response' });
  }
}

async function handleEditMessage(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
  messageId: string,
  conversationId: string,
  content: string,
) {
  try {
    const updatedMessage = await editMessage(messageId, socket.userId, content);
    const room = `conversation:${conversationId}`;

    io.to(room).emit(SOCKET_EVENTS.MESSAGE_UPDATED, formatMessageForEmit({
      ...updatedMessage,
      isEdited: true,
      isDeleted: false,
      status: 'SENT',
      type: 'TEXT',
      replyToId: null,
      attachments: [],
      reactions: [],
    }));

    // Re-stream AI response for edited message in AI_CHAT
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (conversation?.type === 'AI_CHAT') {
      await streamToClient(io, room, conversationId, content, conversation?.systemPrompt);
    }
  } catch (error) {
    logger.error('Error editing message:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to edit message' });
  }
}

async function handleDeleteMessage(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
  messageId: string,
  conversationId: string,
) {
  try {
    await softDeleteMessage(messageId, socket.userId);
    const room = `conversation:${conversationId}`;
    io.to(room).emit(SOCKET_EVENTS.MESSAGE_DELETED, { conversationId, messageId });
  } catch (error) {
    logger.error('Error deleting message:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to delete message' });
  }
}

async function handleReaction(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
  messageId: string,
  conversationId: string,
  emoji: string,
) {
  try {
    await toggleReaction(messageId, socket.userId, emoji);

    // Fetch updated reactions
    const reactions = await prisma.reaction.findMany({
      where: { messageId },
      select: { id: true, userId: true, emoji: true },
    });

    const room = `conversation:${conversationId}`;
    io.to(room).emit(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, {
      conversationId,
      messageId,
      reactions,
    });
  } catch (error) {
    logger.error('Error toggling reaction:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to toggle reaction' });
  }
}

async function handleMessageRead(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
  conversationId: string,
) {
  try {
    await prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: socket.userId } },
      data: { lastReadAt: new Date() },
    });

    // Update message statuses to READ for messages sent by others
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: socket.userId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    const room = `conversation:${conversationId}`;
    // Use io.to() instead of socket.to() so ALL room members receive the update,
    // including the user who triggered the read (they need to see their own messages marked as read)
    io.to(room).emit(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, {
      conversationId,
      messageId: '', // Indicates all messages in conversation
      status: 'READ',
    });
  } catch (error) {
    logger.error('Error marking messages as read:', error);
  }
}

// ─── AI STREAMING ─────────────────────────────────────────────────────────────

async function streamToClient(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  room: string,
  conversationId: string,
  userMessage: string,
  systemPrompt?: string | null,
) {
  const aiMessageId = randomUUID();
  const abortController = new AbortController();
  activeGenerations.set(conversationId, abortController);

  io.to(room).emit(SOCKET_EVENTS.AI_STREAM_START, {
    conversationId,
    messageId: aiMessageId,
  });

  try {
    await streamAIResponse(
      conversationId,
      userMessage,
      {
        onChunk(chunk) {
          io.to(room).emit(SOCKET_EVENTS.AI_STREAM_CHUNK, {
            conversationId,
            messageId: aiMessageId,
            chunk,
          });
        },
        async onComplete(finalContent) {
          const saved = await saveMessage(conversationId, finalContent, 'AI_RESPONSE');
          io.to(room).emit(SOCKET_EVENTS.AI_STREAM_END, {
            conversationId,
            messageId: saved.id,
            fullContent: finalContent,
          });
          activeGenerations.delete(conversationId);
        },
        onError(error) {
          io.to(room).emit(SOCKET_EVENTS.AI_STREAM_ERROR, {
            conversationId,
            error: error.message,
          });
          activeGenerations.delete(conversationId);
        },
      },
      abortController.signal,
      systemPrompt,
    );
  } catch {
    activeGenerations.delete(conversationId);
  }
}
