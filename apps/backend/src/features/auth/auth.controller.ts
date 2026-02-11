import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import * as authService from './auth.service';
import { asyncHandler } from '../../lib/async-handler';

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.signup(req.body);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json(result);
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }
  const result = await authService.refreshTokens(refreshToken);
  res.json(result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  await authService.logout(authReq.userId);
  res.json({ message: 'Logged out successfully' });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const user = await authService.getProfile(authReq.userId);
  res.json(user);
});
