import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { processUpload } from './upload.service';
import { ApiError } from '../../lib/api-error';

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }

  const result = await processUpload(req.file);
  res.json(result);
});
