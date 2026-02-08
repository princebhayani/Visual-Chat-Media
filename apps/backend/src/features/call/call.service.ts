import { prisma } from '../../config/database';
import { ApiError } from '../../lib/api-error';

export async function initiateCall(
  callerId: string,
  conversationId: string,
  calleeId: string,
  type: 'AUDIO' | 'VIDEO',
) {
  // Verify both users are members of the conversation
  const callerMember = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: callerId } },
  });
  if (!callerMember) throw new ApiError(403, 'Not a member of this conversation');

  const calleeMember = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: calleeId } },
  });
  if (!calleeMember) throw new ApiError(404, 'Callee is not a member of this conversation');

  // Check for existing active call in this conversation
  const activeCall = await prisma.call.findFirst({
    where: {
      conversationId,
      status: { in: ['RINGING', 'ACTIVE'] },
    },
  });
  if (activeCall) throw new ApiError(409, 'A call is already in progress');

  const call = await prisma.call.create({
    data: {
      conversationId,
      callerId,
      calleeId,
      type,
      status: 'RINGING',
    },
    include: {
      caller: { select: { id: true, name: true, avatarUrl: true } },
      callee: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return call;
}

export async function acceptCall(callId: string, userId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new ApiError(404, 'Call not found');
  if (call.calleeId !== userId) throw new ApiError(403, 'Only the callee can accept');
  if (call.status !== 'RINGING') throw new ApiError(400, 'Call is not ringing');

  return prisma.call.update({
    where: { id: callId },
    data: { status: 'ACTIVE', startedAt: new Date() },
  });
}

export async function rejectCall(callId: string, userId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new ApiError(404, 'Call not found');
  if (call.calleeId !== userId && call.callerId !== userId) {
    throw new ApiError(403, 'Not authorized');
  }
  if (call.status !== 'RINGING') throw new ApiError(400, 'Call is not ringing');

  return prisma.call.update({
    where: { id: callId },
    data: { status: 'REJECTED', endedAt: new Date() },
  });
}

export async function endCall(callId: string, userId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new ApiError(404, 'Call not found');
  if (call.calleeId !== userId && call.callerId !== userId) {
    throw new ApiError(403, 'Not authorized');
  }

  const endedAt = new Date();
  const duration = call.startedAt
    ? Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000)
    : 0;

  return prisma.call.update({
    where: { id: callId },
    data: { status: 'ENDED', endedAt, duration },
  });
}

export async function getCallHistory(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return prisma.call.findMany({
    where: {
      OR: [{ callerId: userId }, { calleeId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip,
    include: {
      caller: { select: { id: true, name: true, avatarUrl: true } },
      callee: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
}

export async function getCall(callId: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      caller: { select: { id: true, name: true, avatarUrl: true } },
      callee: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
  if (!call) throw new ApiError(404, 'Call not found');
  return call;
}
