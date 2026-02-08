import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import * as notificationService from './notification.service';
import { asyncHandler } from '../../lib/async-handler';

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

  const result = await notificationService.getNotifications(userId, page, limit);
  res.json(result);
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const count = await notificationService.getUnreadCount(userId);
  res.json({ count });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const id = req.params.id as string;
  const notification = await notificationService.markAsRead(id, userId);

  if (!notification) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  res.json({ success: true });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  await notificationService.markAllAsRead(userId);
  res.json({ success: true });
});
