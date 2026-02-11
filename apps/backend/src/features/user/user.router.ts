import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { updateProfileSchema } from '@ai-chat/shared';
import * as userController from './user.controller';

export const userRouter = Router();

// Search users
userRouter.get('/search', userController.searchUsers);

// Get own blocked users list
userRouter.get('/blocked', userController.getBlockedUsers);

// Get user profile by ID
userRouter.get('/:id', userController.getUserProfile);

// Update own profile
userRouter.patch('/me', validate(updateProfileSchema), userController.updateProfile);

// Block / Unblock
userRouter.post('/:id/block', userController.blockUser);
userRouter.delete('/:id/block', userController.unblockUser);
