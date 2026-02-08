import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import * as callService from './call.service';
import { asyncHandler } from '../../lib/async-handler';

export const getCallHistory = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const calls = await callService.getCallHistory(userId, page, limit);

  res.json(
    calls.map((c) => ({
      id: c.id,
      conversationId: c.conversationId,
      callerId: c.callerId,
      caller: c.caller,
      calleeId: c.calleeId,
      callee: c.callee,
      type: c.type,
      status: c.status,
      startedAt: c.startedAt?.toISOString() || null,
      endedAt: c.endedAt?.toISOString() || null,
      duration: c.duration,
      createdAt: c.createdAt.toISOString(),
    })),
  );
});

export const getCallDetails = asyncHandler(async (req: Request, res: Response) => {
  const call = await callService.getCall(req.params.id as string);

  res.json({
    id: call.id,
    conversationId: call.conversationId,
    callerId: call.callerId,
    caller: call.caller,
    calleeId: call.calleeId,
    callee: call.callee,
    type: call.type,
    status: call.status,
    startedAt: call.startedAt?.toISOString() || null,
    endedAt: call.endedAt?.toISOString() || null,
    duration: call.duration,
    createdAt: call.createdAt.toISOString(),
  });
});
