import { Router } from 'express';
import { upload } from './upload.service';
import { uploadFile } from './upload.controller';

export const uploadRouter = Router();

uploadRouter.post('/', upload.single('file'), uploadFile);
