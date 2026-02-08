import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { ApiError } from '../../lib/api-error';

// ─── SEARCH & PROFILE ─────────────────────────────────────────────────────────

export async function searchUsers(query: string, currentUserId: string) {
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUserId } },
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      bio: true,
      status: true,
      isOnline: true,
      lastSeenAt: true,
    },
    take: 20,
    orderBy: { name: 'asc' },
  });

  // Filter out blocked users
  const blocks = await prisma.block.findMany({
    where: {
      OR: [
        { blockerId: currentUserId, blockedId: { in: users.map((u) => u.id) } },
        { blockedId: currentUserId, blockerId: { in: users.map((u) => u.id) } },
      ],
    },
  });

  const blockedIds = new Set([
    ...blocks.map((b) => b.blockerId),
    ...blocks.map((b) => b.blockedId),
  ]);

  return users.filter((u) => !blockedIds.has(u.id));
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      bio: true,
      status: true,
      isOnline: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

export async function updateProfile(
  userId: string,
  data: { name?: string; bio?: string; status?: string; avatarUrl?: string },
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      bio: true,
      status: true,
      isOnline: true,
      lastSeenAt: true,
    },
  });

  return user;
}

// ─── BLOCK / UNBLOCK ──────────────────────────────────────────────────────────

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new ApiError(400, 'Cannot block yourself');

  const targetUser = await prisma.user.findUnique({ where: { id: blockedId } });
  if (!targetUser) throw new ApiError(404, 'User not found');

  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  if (existing) throw new ApiError(409, 'User already blocked');

  return prisma.block.create({
    data: { blockerId, blockedId },
  });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const block = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  if (!block) throw new ApiError(404, 'Block not found');

  await prisma.block.delete({
    where: { id: block.id },
  });
}

export async function getBlockedUsers(userId: string) {
  const blocks = await prisma.block.findMany({
    where: { blockerId: userId },
    include: {
      blocked: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return blocks.map((b) => ({
    ...b.blocked,
    blockedAt: b.createdAt,
  }));
}

// ─── PRESENCE ─────────────────────────────────────────────────────────────────

export async function setUserOnline(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: true },
  });

  // Redis key for fast presence lookups
  await redis.set(`online:${userId}`, '1');
}

export async function setUserOffline(userId: string) {
  const now = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: false, lastSeenAt: now },
  });

  await redis.del(`online:${userId}`);
  return now;
}

export async function isUserOnline(userId: string): Promise<boolean> {
  const result = await redis.get(`online:${userId}`);
  return result === '1';
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export async function isBlocked(userId1: string, userId2: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId1, blockedId: userId2 },
        { blockerId: userId2, blockedId: userId1 },
      ],
    },
  });
  return !!block;
}
