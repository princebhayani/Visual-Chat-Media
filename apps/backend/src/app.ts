import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { authRouter } from './features/auth/auth.router';
import { chatRouter } from './features/chat/chat.router';
import { userRouter } from './features/user/user.router';
import { uploadRouter } from './features/upload/upload.router';
import { callRouter } from './features/call/call.router';
import { notificationRouter } from './features/notification/notification.router';
import { authMiddleware } from './middleware/auth.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware';

export function createApp() {
  const app = express();

  // Global middleware
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(rateLimitMiddleware);

  // Static file serving for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Public routes
  app.use('/api/auth', authRouter);

  // Protected routes
  app.use('/api/conversations', authMiddleware, chatRouter);
  app.use('/api/users', authMiddleware, userRouter);
  app.use('/api/upload', authMiddleware, uploadRouter);
  app.use('/api/calls', authMiddleware, callRouter);
  app.use('/api/notifications', authMiddleware, notificationRouter);

  // Error handler (must be last)
  app.use(errorMiddleware);

  return app;
}
