import { prisma } from '../../config/database';
import { getIO } from '../../lib/socket-io';
import { SOCKET_EVENTS } from '@ai-chat/shared';

type NotificationType = 'NEW_MESSAGE' | 'MENTION' | 'CALL_MISSED' | 'GROUP_INVITE' | 'AI_COMPLETE';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
    },
  });

  // Emit to user's socket room
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NEW_NOTIFICATION, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data as Record<string, unknown> | undefined,
    });
  } catch {
    // Socket might not be initialized in tests
  }

  return notification;
}

export async function getNotifications(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return {
    notifications: notifications.map((n: { id: string; userId: string; type: string; title: string; body: string; data: unknown; isRead: boolean; createdAt: Date }) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      isRead: n.isRead,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) return null;

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
