import { Server } from 'socket.io';
import { SOCKET_EVENTS } from '@ai-chat/shared';
import type { ClientToServerEvents, ServerToClientEvents } from '@ai-chat/shared';
import type { AuthenticatedSocket } from './socket.handler';
import * as callService from '../features/call/call.service';
import { logger } from '../lib/logger';

// In-memory map: callId → { callerId, calleeId }
// Populated on CALL_INITIATE/CALL_ACCEPT, cleaned up on CALL_END/CALL_REJECTED
const activeCallParticipants = new Map<
  string,
  { callerId: string; calleeId: string }
>();

/**
 * Given a callId and the current user, return the other participant's userId.
 * Returns null if the call is not tracked or the user is not a participant.
 */
function getOtherParticipant(
  callId: string,
  currentUserId: string,
): string | null {
  const participants = activeCallParticipants.get(callId);
  if (!participants) return null;
  if (participants.callerId === currentUserId) return participants.calleeId;
  if (participants.calleeId === currentUserId) return participants.callerId;
  return null;
}

export function callSocketHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
) {
  socket.on(SOCKET_EVENTS.CALL_INITIATE, async (data) => {
    try {
      const { conversationId, calleeId, type } = data;
      const call = await callService.initiateCall(
        socket.userId,
        conversationId,
        calleeId,
        type,
      );

      // Track participants in memory for fast signaling relay
      activeCallParticipants.set(call.id, {
        callerId: socket.userId,
        calleeId,
      });

      // Notify callee via their personal room
      io.to(`user:${calleeId}`).emit(SOCKET_EVENTS.CALL_RINGING, {
        callId: call.id,
        callerId: socket.userId,
        callerName: call.caller.name,
        conversationId,
        type,
      });

      // Notify caller that call was initiated
      socket.emit(SOCKET_EVENTS.CALL_RINGING, {
        callId: call.id,
        callerId: socket.userId,
        callerName: call.caller.name,
        conversationId,
        type,
      });
    } catch (error) {
      logger.error('Error initiating call:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        message:
          error instanceof Error ? error.message : 'Failed to initiate call',
      });
    }
  });

  socket.on(SOCKET_EVENTS.CALL_ACCEPT, async (data) => {
    try {
      const call = await callService.acceptCall(data.callId, socket.userId);

      // Ensure participants are tracked (in case server restarted)
      if (!activeCallParticipants.has(call.id)) {
        activeCallParticipants.set(call.id, {
          callerId: call.callerId,
          calleeId: call.calleeId,
        });
      }

      io.to(`user:${call.callerId}`).emit(SOCKET_EVENTS.CALL_ACCEPTED, {
        callId: call.id,
      });
    } catch (error) {
      logger.error('Error accepting call:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        message:
          error instanceof Error ? error.message : 'Failed to accept call',
      });
    }
  });

  socket.on(SOCKET_EVENTS.CALL_REJECT, async (data) => {
    try {
      const call = await callService.rejectCall(data.callId, socket.userId);
      const otherUserId =
        call.callerId === socket.userId ? call.calleeId : call.callerId;
      io.to(`user:${otherUserId}`).emit(SOCKET_EVENTS.CALL_REJECTED, {
        callId: call.id,
      });

      // Clean up participant tracking
      activeCallParticipants.delete(call.id);
    } catch (error) {
      logger.error('Error rejecting call:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        message:
          error instanceof Error ? error.message : 'Failed to reject call',
      });
    }
  });

  socket.on(SOCKET_EVENTS.CALL_END, async (data) => {
    try {
      const call = await callService.endCall(data.callId, socket.userId);
      const otherUserId =
        call.callerId === socket.userId ? call.calleeId : call.callerId;
      io.to(`user:${otherUserId}`).emit(SOCKET_EVENTS.CALL_ENDED, {
        callId: call.id,
      });
      socket.emit(SOCKET_EVENTS.CALL_ENDED, { callId: call.id });

      // Clean up participant tracking
      activeCallParticipants.delete(call.id);
    } catch (error) {
      logger.error('Error ending call:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        message:
          error instanceof Error ? error.message : 'Failed to end call',
      });
    }
  });

  // ─── WebRTC Signaling — Targeted relay to call peer only ─────────────────

  socket.on(SOCKET_EVENTS.CALL_ICE_CANDIDATE, (data) => {
    const { callId, candidate } = data;
    const otherUserId = getOtherParticipant(callId, socket.userId);
    if (!otherUserId) {
      logger.warn(
        `ICE candidate relay failed: no participant found for call ${callId}`,
      );
      return;
    }
    io.to(`user:${otherUserId}`).emit(SOCKET_EVENTS.CALL_ICE_CANDIDATE, {
      callId,
      candidate,
    });
  });

  socket.on(SOCKET_EVENTS.CALL_OFFER, (data) => {
    const { callId, offer } = data;
    const otherUserId = getOtherParticipant(callId, socket.userId);
    if (!otherUserId) {
      logger.warn(
        `SDP offer relay failed: no participant found for call ${callId}`,
      );
      return;
    }
    io.to(`user:${otherUserId}`).emit(SOCKET_EVENTS.CALL_OFFER, {
      callId,
      offer,
    });
  });

  socket.on(SOCKET_EVENTS.CALL_ANSWER, (data) => {
    const { callId, answer } = data;
    const otherUserId = getOtherParticipant(callId, socket.userId);
    if (!otherUserId) {
      logger.warn(
        `SDP answer relay failed: no participant found for call ${callId}`,
      );
      return;
    }
    io.to(`user:${otherUserId}`).emit(SOCKET_EVENTS.CALL_ANSWER, {
      callId,
      answer,
    });
  });
}
