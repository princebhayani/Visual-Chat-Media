import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../lib/api-error';
import { logger } from '../lib/logger';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errors: err.errors,
    });
  }

  logger.error('Unhandled error:', err.message, err.stack);
  return res.status(500).json({ message: 'Internal server error' });
}
