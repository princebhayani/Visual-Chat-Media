import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { ApiError } from '../../lib/api-error';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt.service';
import type { SignupInput, LoginInput } from '@ai-chat/shared';

function generateTokens(userId: string, email: string) {
  return {
    accessToken: signAccessToken({ userId, email }),
    refreshToken: signRefreshToken({ userId, email }),
  };
}

async function storeRefreshToken(userId: string, refreshToken: string) {
  await redis.set(`refresh:${userId}`, refreshToken, 'EX', 7 * 24 * 60 * 60);
}

function formatUser(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio?: string | null;
  status?: string | null;
  lastSeenAt?: Date | null;
  isOnline?: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    bio: user.bio || null,
    status: user.status || null,
    lastSeenAt: user.lastSeenAt?.toISOString() || null,
    isOnline: user.isOnline || false,
  };
}

export async function signup(data: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
    },
  });

  const tokens = generateTokens(user.id, user.email);
  await storeRefreshToken(user.id, tokens.refreshToken);
  return { user: formatUser(user), tokens };
}

export async function login(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new ApiError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid credentials');

  const tokens = generateTokens(user.id, user.email);
  await storeRefreshToken(user.id, tokens.refreshToken);
  return { user: formatUser(user), tokens };
}

export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) throw new ApiError(401, 'Invalid refresh token');

  // Verify token exists in Redis
  const stored = await redis.get(`refresh:${payload.userId}`);
  if (stored !== refreshToken) throw new ApiError(401, 'Refresh token revoked');

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new ApiError(401, 'User not found');

  const tokens = generateTokens(user.id, user.email);
  await storeRefreshToken(user.id, tokens.refreshToken);
  return { user: formatUser(user), tokens };
}

export async function logout(userId: string) {
  await redis.del(`refresh:${userId}`);
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');
  return formatUser(user);
}
