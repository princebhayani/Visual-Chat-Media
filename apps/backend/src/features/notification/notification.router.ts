import { Router } from 'express';
import * as controller from './notification.controller';

export const notificationRouter = Router();

notificationRouter.get('/', controller.listNotifications);
notificationRouter.get('/unread-count', controller.getUnreadCount);
notificationRouter.patch('/:id/read', controller.markAsRead);
notificationRouter.post('/read-all', controller.markAllAsRead);
