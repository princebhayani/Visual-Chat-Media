/**
 * Signaling Event Types and Schemas
 * 
 * Defines the event structure for WebRTC signaling over Socket.io
 */

export type SignalingEventType =
	// Call control events
	| 'call:initiate'
	| 'call:accept'
	| 'call:decline'
	| 'call:end'
	| 'call:cancel'
	
	// WebRTC signaling events
	| 'signal:offer'
	| 'signal:answer'
	| 'signal:ice-candidate'
	| 'signal:ice-restart'
	
	// Media events
	| 'media:track-added'
	| 'media:track-removed'
	| 'media:screen-share-start'
	| 'media:screen-share-stop'
	
	// Peer events
	| 'peer:joined'
	| 'peer:left'
	| 'peer:state-change'
	
	// Room events
	| 'room:join'
	| 'room:leave'
	| 'room:participants';

export interface BaseEvent {
	messageId?: string;
	timestamp: number;
	version: string;
	roomId: string;
	userId: string;
	socketId: string;
}

// Call Control Events
export interface CallInitiateEvent extends BaseEvent {
	type: 'call:initiate';
	data: {
		callId: string;
		callerId: string;
		callerName?: string;
		callerAvatar?: string;
		conversationId?: string;
		callType: 'video' | 'audio';
	};
}

export interface CallAcceptEvent extends BaseEvent {
	type: 'call:accept';
	data: {
		callId: string;
	};
}

export interface CallDeclineEvent extends BaseEvent {
	type: 'call:decline';
	data: {
		callId: string;
		reason?: string;
	};
}

export interface CallEndEvent extends BaseEvent {
	type: 'call:end';
	data: {
		callId: string;
	};
}

export interface CallCancelEvent extends BaseEvent {
	type: 'call:cancel';
	data: {
		callId: string;
	};
}

// Signaling Events
export interface SignalOfferEvent extends BaseEvent {
	type: 'signal:offer';
	data: {
		offer: RTCSessionDescriptionInit;
		targetSocketId: string;
		renegotiation?: boolean;
		iceRestart?: boolean;
	};
}

export interface SignalAnswerEvent extends BaseEvent {
	type: 'signal:answer';
	data: {
		answer: RTCSessionDescriptionInit;
		targetSocketId: string;
	};
}

export interface SignalIceCandidateEvent extends BaseEvent {
	type: 'signal:ice-candidate';
	data: {
		candidate: RTCIceCandidateInit;
		targetSocketId: string;
	};
}

export interface SignalIceRestartEvent extends BaseEvent {
	type: 'signal:ice-restart';
	data: {
		targetSocketId: string;
		reason: string;
	};
}

// Media Events
export interface MediaTrackAddedEvent extends BaseEvent {
	type: 'media:track-added';
	data: {
		kind: 'audio' | 'video';
		trackId: string;
	};
}

export interface MediaTrackRemovedEvent extends BaseEvent {
	type: 'media:track-removed';
	data: {
		kind: 'audio' | 'video';
		trackId: string;
	};
}

export interface MediaScreenShareStartEvent extends BaseEvent {
	type: 'media:screen-share-start';
	data: {
		userId: string;
	};
}

export interface MediaScreenShareStopEvent extends BaseEvent {
	type: 'media:screen-share-stop';
	data: {
		userId: string;
	};
}

// Peer Events
export interface PeerJoinedEvent extends BaseEvent {
	type: 'peer:joined';
	data: {
		userId: string;
		socketId: string;
	};
}

export interface PeerLeftEvent extends BaseEvent {
	type: 'peer:left';
	data: {
		userId: string;
		socketId: string;
	};
}

export interface PeerStateChangeEvent extends BaseEvent {
	type: 'peer:state-change';
	data: {
		userId: string;
		socketId: string;
		state: 'connecting' | 'connected' | 'disconnected' | 'failed';
	};
}

// Room Events
export interface RoomJoinEvent extends BaseEvent {
	type: 'room:join';
	data: {
		roomId: string;
	};
}

export interface RoomLeaveEvent extends BaseEvent {
	type: 'room:leave';
	data: {
		roomId: string;
	};
}

export interface RoomParticipantsEvent extends BaseEvent {
	type: 'room:participants';
	data: {
		participants: Array<{
			userId: string;
			socketId: string;
		}>;
	};
}

// Union type for all events
export type SignalingEvent =
	| CallInitiateEvent
	| CallAcceptEvent
	| CallDeclineEvent
	| CallEndEvent
	| CallCancelEvent
	| SignalOfferEvent
	| SignalAnswerEvent
	| SignalIceCandidateEvent
	| SignalIceRestartEvent
	| MediaTrackAddedEvent
	| MediaTrackRemovedEvent
	| MediaScreenShareStartEvent
	| MediaScreenShareStopEvent
	| PeerJoinedEvent
	| PeerLeftEvent
	| PeerStateChangeEvent
	| RoomJoinEvent
	| RoomLeaveEvent
	| RoomParticipantsEvent;

/**
 * Event acknowledgment
 */
export interface EventAcknowledgment {
	messageId: string;
	success: boolean;
	error?: string;
	timestamp: number;
}

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create base event structure
 */
export function createBaseEvent(
	roomId: string,
	userId: string,
	socketId: string
): Omit<BaseEvent, 'type' | 'data'> {
	return {
		messageId: generateMessageId(),
		timestamp: Date.now(),
		version: '1.0.0',
		roomId,
		userId,
		socketId,
	};
}

