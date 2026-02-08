import { prisma } from '../../config/database';
import { ApiError } from '../../lib/api-error';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Check if a user is a member of a conversation */
async function verifyMembership(conversationId: string, userId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) throw new ApiError(404, 'Conversation not found');
  return member;
}

// ─── CONVERSATION CRUD ───────────────────────────────────────────────────────

export async function listConversations(userId: string, search?: string) {
  const memberWhere: any = {
    members: { some: { userId } },
  };

  if (search) {
    memberWhere.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { groupName: { contains: search, mode: 'insensitive' } },
      { messages: { some: { content: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const conversations = await prisma.conversation.findMany({
    where: memberWhere,
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true, email: true, isOnline: true },
          },
        },
      },
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          content: true,
          type: true,
          status: true,
          senderId: true,
          createdAt: true,
        },
      },
      _count: { select: { messages: true } },
    },
  });

  // Calculate unread counts and pinned status per user
  type ConvMember = { userId: string; lastReadAt: Date | null };
  type ConvItem = typeof conversations[number];
  return conversations.map((c: ConvItem) => {
    const userMember = c.members.find((m: ConvMember) => m.userId === userId);
    const isPinned = userMember?.isPinned ?? false;
    const lastReadAt = userMember?.lastReadAt;

    // Count unread messages (messages after lastReadAt that are not from the user)
    let unreadCount = 0;
    if (lastReadAt && c.messages.length > 0) {
      // Approximate: if latest message is after lastReadAt, show unread
      const latestMsg = c.messages[0];
      if (latestMsg.createdAt > lastReadAt && latestMsg.senderId !== userId) {
        unreadCount = 1; // Simplified; full count needs separate query
      }
    } else if (!lastReadAt && c.messages.length > 0) {
      unreadCount = c._count.messages;
    }

    return {
      ...c,
      isPinned,
      unreadCount,
      messageCount: c._count.messages,
    };
  }).sort((a: { isPinned?: boolean; updatedAt: Date }, b: { isPinned?: boolean; updatedAt: Date }) => {
    // Pinned first, then by updatedAt
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function createConversation(
  userId: string,
  data: {
    title?: string;
    type?: 'DIRECT' | 'GROUP' | 'AI_CHAT';
    systemPrompt?: string;
    memberIds?: string[];
    groupName?: string;
    description?: string;
  },
) {
  const type = data.type || 'AI_CHAT';

  // For DIRECT conversations, check if one already exists between these two users
  if (type === 'DIRECT' && data.memberIds?.length === 1) {
    const targetUserId = data.memberIds[0];
    const existing = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true, email: true, isOnline: true },
            },
          },
        },
      },
    });

    if (existing) return existing;
  }

  const conversation = await prisma.conversation.create({
    data: {
      type,
      title: data.title || (type === 'AI_CHAT' ? 'New Chat' : ''),
      groupName: data.groupName || null,
      description: data.description || null,
      systemPrompt: data.systemPrompt || null,
      createdById: userId,
      members: {
        create: [
          { userId, role: 'OWNER' },
          ...(data.memberIds || []).map((id) => ({ userId: id, role: 'MEMBER' as const })),
        ],
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true, email: true, isOnline: true },
          },
        },
      },
    },
  });

  return conversation;
}

export async function getConversation(id: string, userId: string) {
  await verifyMembership(id, userId);

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true, email: true, isOnline: true },
          },
        },
      },
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true },
          },
          attachments: true,
          reactions: true,
          replyTo: {
            select: { id: true, content: true, senderId: true },
          },
        },
      },
    },
  });

  if (!conversation) throw new ApiError(404, 'Conversation not found');

  // Update lastReadAt for this user
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId: id, userId } },
    data: { lastReadAt: new Date() },
  });

  return conversation;
}

export async function updateConversation(
  id: string,
  userId: string,
  data: { title?: string; groupName?: string; description?: string | null; systemPrompt?: string | null },
) {
  const member = await verifyMembership(id, userId);

  // Only OWNER or ADMIN can update group info
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  if (conversation.type === 'GROUP' && !['OWNER', 'ADMIN'].includes(member.role)) {
    throw new ApiError(403, 'Only admins can update group info');
  }

  return prisma.conversation.update({
    where: { id },
    data,
  });
}

export async function deleteConversation(id: string, userId: string) {
  const member = await verifyMembership(id, userId);
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  // Only OWNER can delete a conversation, or any member can delete their own AI_CHAT
  if (conversation.type === 'AI_CHAT' && conversation.createdById === userId) {
    await prisma.conversation.delete({ where: { id } });
    return;
  }

  if (member.role !== 'OWNER') {
    throw new ApiError(403, 'Only the owner can delete this conversation');
  }

  await prisma.conversation.delete({ where: { id } });
}

// ─── PINNING (per-member) ─────────────────────────────────────────────────────

export async function togglePin(conversationId: string, userId: string, isPinned: boolean) {
  await verifyMembership(conversationId, userId);
  return prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { isPinned },
  });
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

export async function getMessages(
  conversationId: string,
  userId: string,
  cursor?: string,
  limit = 50,
) {
  await verifyMembership(conversationId, userId);

  return prisma.message.findMany({
    where: { conversationId, isDeleted: false },
    orderBy: { createdAt: 'asc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
      attachments: true,
      reactions: true,
      replyTo: {
        select: { id: true, content: true, senderId: true },
      },
    },
  });
}

export async function saveMessage(
  conversationId: string,
  content: string,
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'SYSTEM' | 'AI_RESPONSE' = 'TEXT',
  senderId?: string,
  tokenCount?: number,
  replyToId?: string,
  attachments?: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
  }[],
) {
  const message = await prisma.message.create({
    data: {
      conversationId,
      content,
      type,
      senderId: senderId ?? null,
      tokenCount: tokenCount ?? null,
      replyToId: replyToId ?? null,
      ...(attachments && attachments.length > 0
        ? {
            attachments: {
              create: attachments.map((a: { fileUrl: string; fileName: string; fileSize: number; mimeType: string; thumbnailUrl?: string; width?: number; height?: number }) => ({
                fileUrl: a.fileUrl,
                fileName: a.fileName,
                fileSize: a.fileSize,
                mimeType: a.mimeType,
                thumbnailUrl: a.thumbnailUrl ?? null,
                width: a.width ?? null,
                height: a.height ?? null,
              })),
            },
          }
        : {}),
    },
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
      attachments: true,
      reactions: true,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}

export async function deleteLastAssistantMessage(conversationId: string, userId: string) {
  await verifyMembership(conversationId, userId);

  const lastMessage = await prisma.message.findFirst({
    where: { conversationId, type: 'AI_RESPONSE' },
    orderBy: { createdAt: 'desc' },
  });

  if (lastMessage) {
    await prisma.message.delete({ where: { id: lastMessage.id } });
  }

  return lastMessage;
}

export async function editMessage(messageId: string, userId: string, content: string) {
  const message = await prisma.message.findFirst({
    where: { id: messageId, senderId: userId, type: 'TEXT' },
  });
  if (!message) throw new ApiError(404, 'Message not found');

  // In AI_CHAT: delete all messages after this one (for re-generation)
  const conversation = await prisma.conversation.findUnique({
    where: { id: message.conversationId },
  });

  if (conversation?.type === 'AI_CHAT') {
    await prisma.message.deleteMany({
      where: {
        conversationId: message.conversationId,
        createdAt: { gt: message.createdAt },
      },
    });
  }

  // Update the message
  return prisma.message.update({
    where: { id: messageId },
    data: { content, isEdited: true },
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });
}

export async function softDeleteMessage(messageId: string, userId: string) {
  const message = await prisma.message.findFirst({
    where: { id: messageId, senderId: userId },
  });
  if (!message) throw new ApiError(404, 'Message not found');

  return prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true, deletedAt: new Date(), content: '' },
  });
}

// ─── GROUPS ───────────────────────────────────────────────────────────────────

export async function addGroupMember(conversationId: string, userId: string, targetUserId: string) {
  const member = await verifyMembership(conversationId, userId);
  if (!['OWNER', 'ADMIN'].includes(member.role)) {
    throw new ApiError(403, 'Only admins can add members');
  }

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (conversation?.type !== 'GROUP') throw new ApiError(400, 'Not a group conversation');

  // Check if already a member
  const existing = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
  });
  if (existing) throw new ApiError(409, 'User is already a member');

  const newMember = await prisma.conversationMember.create({
    data: { conversationId, userId: targetUserId, role: 'MEMBER' },
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true, email: true, isOnline: true },
      },
    },
  });

  // Add system message
  await saveMessage(conversationId, `${newMember.user.name} was added to the group`, 'SYSTEM');

  return newMember;
}

export async function removeGroupMember(conversationId: string, userId: string, targetUserId: string) {
  const member = await verifyMembership(conversationId, userId);
  if (!['OWNER', 'ADMIN'].includes(member.role) && userId !== targetUserId) {
    throw new ApiError(403, 'Only admins can remove members');
  }

  const targetMember = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
    include: { user: { select: { name: true } } },
  });
  if (!targetMember) throw new ApiError(404, 'Member not found');
  if (targetMember.role === 'OWNER') throw new ApiError(400, 'Cannot remove the owner');

  await prisma.conversationMember.delete({
    where: { id: targetMember.id },
  });

  // Add system message
  const action = userId === targetUserId ? 'left the group' : 'was removed from the group';
  await saveMessage(conversationId, `${targetMember.user.name} ${action}`, 'SYSTEM');

  return targetMember;
}

export async function updateMemberRole(
  conversationId: string,
  userId: string,
  targetUserId: string,
  role: 'ADMIN' | 'MEMBER',
) {
  const member = await verifyMembership(conversationId, userId);
  if (member.role !== 'OWNER') throw new ApiError(403, 'Only the owner can change roles');

  const targetMember = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
  });
  if (!targetMember) throw new ApiError(404, 'Member not found');

  return prisma.conversationMember.update({
    where: { id: targetMember.id },
    data: { role },
  });
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export async function exportConversation(id: string, userId: string, format: 'json' | 'markdown' = 'markdown') {
  const conversation = await getConversation(id, userId);

  if (format === 'json') {
    return conversation;
  }

  // Markdown format
  let markdown = `# ${conversation.title || conversation.groupName || 'Conversation'}\n\n`;
  markdown += `*Created: ${new Date(conversation.createdAt).toLocaleDateString()}*\n\n---\n\n`;

  for (const msg of conversation.messages) {
    const senderName = msg.type === 'AI_RESPONSE' ? 'AI' : (msg.sender?.name || 'System');
    markdown += `**${senderName}:**\n\n${msg.content}\n\n---\n\n`;
  }

  return markdown;
}

// ─── REACTIONS ────────────────────────────────────────────────────────────────

export async function toggleReaction(messageId: string, userId: string, emoji: string) {
  const existing = await prisma.reaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return { action: 'removed' as const };
  }

  await prisma.reaction.create({
    data: { messageId, userId, emoji },
  });
  return { action: 'added' as const };
}
