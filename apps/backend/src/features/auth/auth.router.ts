import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { signupSchema, loginSchema } from '@ai-chat/shared';
import { authMiddleware } from '../../middleware/auth.middleware';
import * as authController from './auth.controller';

export const authRouter = Router();

authRouter.post('/signup', validate(signupSchema), authController.signup);
authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.post('/refresh', authController.refreshToken);
authRouter.post('/logout', authMiddleware, authController.logout);
authRouter.get('/me', authMiddleware, authController.getProfile);
