import type { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../lib/api-error';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors as Record<string, string[]>;
      throw new ApiError(400, 'Validation failed', errors);
    }
    req.body = result.data;
    next();
  };
}
