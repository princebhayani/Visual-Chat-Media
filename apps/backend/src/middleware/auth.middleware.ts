import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../features/auth/jwt.service';
import { ApiError } from '../lib/api-error';

export interface AuthRequest extends Request {
  userId: string;
  userEmail: string;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  (req as AuthRequest).userId = payload.userId;
  (req as AuthRequest).userEmail = payload.email;
  next();
}
