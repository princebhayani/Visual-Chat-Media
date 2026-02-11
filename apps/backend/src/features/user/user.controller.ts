import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import * as userService from './user.service';
import { asyncHandler } from '../../lib/async-handler';

export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const query = req.query.q as string;

  if (!query || query.length < 1) {
    res.json([]);
    return;
  }

  const users = await userService.searchUsers(query, userId);
  res.json(users);
});

export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const profile = await userService.getUserProfile(id);
  res.json({
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    lastSeenAt: profile.lastSeenAt?.toISOString() || null,
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const user = await userService.updateProfile(userId, req.body);
  res.json({
    ...user,
    lastSeenAt: user.lastSeenAt?.toISOString() || null,
  });
});

export const blockUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const blockedId = req.params.id as string;
  await userService.blockUser(userId, blockedId);
  res.status(201).json({ message: 'User blocked' });
});

export const unblockUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const blockedId = req.params.id as string;
  await userService.unblockUser(userId, blockedId);
  res.json({ message: 'User unblocked' });
});

export const getBlockedUsers = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const blockedUsers = await userService.getBlockedUsers(userId);
  res.json(blockedUsers);
});
