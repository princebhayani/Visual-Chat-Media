/**
 * Signaling Client
 * 
 * Handles all Socket.io signaling events with proper typing and acknowledgment
 */

import { Socket } from 'socket.io-client';
import {
	SignalingEvent,
	createBaseEvent,
	generateMessageId,
	EventAcknowledgment,
} from './events';

export interface SignalingClientOptions {
	socket: Socket;
	roomId: string;
	userId: string;
}

export type EventCallback<T = any> = (data: T) => void | Promise<void>;
export type AcknowledgmentCallback = (ack: EventAcknowledgment) => void;

export class SignalingClient {
	private socket: Socket;
	private roomId: string;
	private userId: string;
	private pendingAcks: Map<string, { resolve: AcknowledgmentCallback; timeout: NodeJS.Timeout }> = new Map();
	private defaultAckTimeout = 5000; // 5 seconds

	constructor(options: SignalingClientOptions) {
		this.socket = options.socket;
		this.roomId = options.roomId;
		this.userId = options.userId;

		this.setupAcknowledgmentHandler();
	}

	/**
	 * Setup acknowledgment handler
	 */
	private setupAcknowledgmentHandler(): void {
		this.socket.on('event:ack', (ack: EventAcknowledgment) => {
			const pending = this.pendingAcks.get(ack.messageId);
			if (pending) {
				clearTimeout(pending.timeout);
				this.pendingAcks.delete(ack.messageId);
				pending.resolve(ack);
			}
		});
	}

	/**
	 * Create base event data
	 */
	private createBaseEventData(): Omit<SignalingEvent, 'type' | 'data'> {
		return createBaseEvent(this.roomId, this.userId, this.socket.id);
	}

	/**
	 * Emit event with acknowledgment
	 */
	private async emitWithAck(
		event: string,
		data: any,
		timeout = this.defaultAckTimeout
	): Promise<EventAcknowledgment> {
		const messageId = data.messageId || generateMessageId();
		data.messageId = messageId;

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				this.pendingAcks.delete(messageId);
				reject(new Error(`Event acknowledgment timeout: ${event}`));
			}, timeout);

			this.pendingAcks.set(messageId, {
				resolve: (ack) => {
					if (ack.success) {
						resolve(ack);
					} else {
						reject(new Error(ack.error || 'Event failed'));
					}
				},
				timeout: timeoutId,
			});

			this.socket.emit(event, data);
		});
	}

	/**
	 * Emit event without acknowledgment (fire and forget)
	 */
	private emit(event: string, data: any): void {
		this.socket.emit(event, data);
	}

	// Call Control Events

	async initiateCall(data: {
		callId: string;
		callerName?: string;
		callerAvatar?: string;
		conversationId?: string;
		callType: 'video' | 'audio';
	}): Promise<void> {
		const event = {
			...this.createBaseEventData(),
			type: 'call:initiate' as const,
			data: {
				callId: data.callId,
				callerId: this.userId,
				callerName: data.callerName,
				callerAvatar: data.callerAvatar,
				conversationId: data.conversationId,
				callType: data.callType,
			},
		};

		await this.emitWithAck('call:initiate', event);
	}

	async acceptCall(callId: string): Promise<void> {
		const event = {
			...this.createBaseEventData(),
			type: 'call:accept' as const,
			data: { callId },
		};

		await this.emitWithAck('call:accept', event);
	}

	async declineCall(callId: string, reason?: string): Promise<void> {
		const event = {
			...this.createBaseEventData(),
			type: 'call:decline' as const,
			data: { callId, reason },
		};

		await this.emitWithAck('call:decline', event);
	}

	async endCall(callId: string): Promise<void> {
		const event = {
			...this.createBaseEventData(),
			type: 'call:end' as const,
			data: { callId },
		};

		await this.emitWithAck('call:end', event);
	}

	async cancelCall(callId: string): Promise<void> {
		const event = {
			...this.createBaseEventData(),
			type: 'call:cancel' as const,
			data: { callId },
		};

		await this.emitWithAck('call:cancel', event);
	}

	// Signaling Events

	async sendOffer(data: {
		offer: RTCSessionDescriptionInit;
		targetSocketId: string;
		renegotiation?: boolean;
		iceRestart?: boolean;
	}): Promise<void> {
		const event = {
			...this.createBaseEventData(),
			type: 'signal:offer' as const,
			data: {
				offer: data.offer,
				targetSocketId: data.targetSocketId,
				renegotiation: data.renegotiation || false,
				iceRestart: data.iceRestart || false,
			},
		};

		this.emit('signal:offer', event);
	}

	async sendAnswer(data: {
		answer: RTCSessionDescriptionInit;
		targetSocketId: string;
	}): Promise<void> {
		const event = {
			...this.createBaseEventData(),
			type: 'signal:answer' as const,
			data: {
				answer: data.answer,
				targetSocketId: data.targetSocketId,
			},
		};

		this.emit('signal:answer', event);
	}

	async sendIceCandidate(data: {
		candidate: RTCIceCandidateInit;
		targetSocketId: string;
	}): Promise<void> {
		const event = {
			...this.createBaseEventData(),
			type: 'signal:ice-candidate' as const,
			data: {
				candidate: data.candidate,
				targetSocketId: data.targetSocketId,
			},
		};

		this.emit('signal:ice-candidate', event);
	}

	async requestIceRestart(targetSocketId: string, reason: string): Promise<void> {
		const event = {
			...this.createBaseEventData(),
			type: 'signal:ice-restart' as const,
			data: {
				targetSocketId,
				reason,
			},
		};

		await this.emitWithAck('signal:ice-restart', event);
	}

	// Room Events

	async joinRoom(): Promise<void> {
		const event = {
			...this.createBaseEventData(),
			type: 'room:join' as const,
			data: { roomId: this.roomId },
		};

		await this.emitWithAck('room:join', event);
	}

	async leaveRoom(): Promise<void> {
		const event = {
			...this.createBaseEventData(),
			type: 'room:leave' as const,
			data: { roomId: this.roomId },
		};

		await this.emitWithAck('room:leave', event);
	}

	// Event Listeners

	on<T extends SignalingEvent>(eventType: T['type'], callback: EventCallback<T['data']>): void {
		this.socket.on(eventType, (event: T) => {
			// Acknowledge receipt
			if (event.messageId) {
				this.socket.emit('event:ack', {
					messageId: event.messageId,
					success: true,
					timestamp: Date.now(),
				} as EventAcknowledgment);
			}

			callback(event.data);
		});
	}

	off(eventType: SignalingEvent['type'], callback?: EventCallback): void {
		if (callback) {
			this.socket.off(eventType, callback);
		} else {
			this.socket.off(eventType);
		}
	}

	once<T extends SignalingEvent>(eventType: T['type'], callback: EventCallback<T['data']>): void {
		this.socket.once(eventType, (event: T) => {
			// Acknowledge receipt
			if (event.messageId) {
				this.socket.emit('event:ack', {
					messageId: event.messageId,
					success: true,
					timestamp: Date.now(),
				} as EventAcknowledgment);
			}

			callback(event.data);
		});
	}

	/**
	 * Cleanup
	 */
	disconnect(): void {
		// Clear pending acknowledgments
		this.pendingAcks.forEach(({ timeout }) => clearTimeout(timeout));
		this.pendingAcks.clear();

		// Remove all listeners
		this.socket.removeAllListeners();
	}

	/**
	 * Get socket ID
	 */
	getSocketId(): string {
		return this.socket.id;
	}

	/**
	 * Check if connected
	 */
	isConnected(): boolean {
		return this.socket.connected;
	}
}

