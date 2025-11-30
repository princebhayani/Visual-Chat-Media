/**
 * Bandwidth Distribution Manager
 * 
 * Manages bandwidth allocation across multiple streams in group calls
 * Implements selective subscription based on active speakers and available bandwidth
 */

import { SFUClient } from './sfu-client';
import { ConnectionQuality } from '@/lib/webrtc/utils';

export interface ParticipantStream {
	userId: string;
	producerIds: {
		audio?: string;
		video?: string;
		screen?: string;
	};
	isSubscribed: {
		audio: boolean;
		video: boolean;
		screen: boolean;
	};
	isActiveSpeaker: boolean;
	priority: number; // Higher = more important
}

export interface BandwidthManagerOptions {
	sfuClient: SFUClient;
	maxSubscribedVideoStreams?: number; // Max video streams to subscribe to
	maxSubscribedAudioStreams?: number; // Max audio streams (usually all)
	prioritizeActiveSpeaker?: boolean;
	qualityAdjustment?: boolean;
}

export class BandwidthManager {
	private sfuClient: SFUClient;
	private participants: Map<string, ParticipantStream> = new Map();
	private options: Required<BandwidthManagerOptions>;
	private currentBandwidth: number = 0; // Estimated available bandwidth
	private maxVideoStreams: number;

	constructor(options: BandwidthManagerOptions) {
		this.sfuClient = options.sfuClient;
		this.options = {
			maxSubscribedVideoStreams: options.maxSubscribedVideoStreams || 6,
			maxSubscribedAudioStreams: options.maxSubscribedAudioStreams || 12,
			prioritizeActiveSpeaker: options.prioritizeActiveSpeaker !== false,
			qualityAdjustment: options.qualityAdjustment !== false,
		};
		this.maxVideoStreams = this.options.maxSubscribedVideoStreams;
	}

	/**
	 * Add participant stream
	 */
	addParticipant(participant: ParticipantStream): void {
		this.participants.set(participant.userId, participant);
		this.updateSubscriptions();
	}

	/**
	 * Remove participant
	 */
	removeParticipant(userId: string): void {
		const participant = this.participants.get(userId);
		if (participant) {
			// Unsubscribe from streams
			this.unsubscribeFromParticipant(participant);
			this.participants.delete(userId);
			this.updateSubscriptions();
		}
	}

	/**
	 * Update active speaker
	 */
	setActiveSpeaker(userId: string | null): void {
		// Reset all active speaker flags
		this.participants.forEach(p => {
			p.isActiveSpeaker = p.userId === userId || false;
		});

		this.updateSubscriptions();
	}

	/**
	 * Update subscriptions based on bandwidth and priorities
	 */
	private async updateSubscriptions(): Promise<void> {
		const participants = Array.from(this.participants.values());

		// Always subscribe to all audio streams (low bandwidth)
		for (const participant of participants) {
			if (participant.producerIds.audio && !participant.isSubscribed.audio) {
				await this.subscribeToAudio(participant);
			}
		}

		// Prioritize video streams
		// Sort by priority (active speaker first, then by priority)
		const sortedParticipants = participants
			.filter(p => p.producerIds.video || p.producerIds.screen)
			.sort((a, b) => {
				// Active speaker first
				if (a.isActiveSpeaker !== b.isActiveSpeaker) {
					return a.isActiveSpeaker ? -1 : 1;
				}
				// Then by priority
				return b.priority - a.priority;
			});

		// Subscribe to top N video streams
		const streamsToSubscribe = sortedParticipants.slice(0, this.maxVideoStreams);
		const streamsToUnsubscribe = sortedParticipants.slice(this.maxVideoStreams);

		// Subscribe to high-priority streams
		for (const participant of streamsToSubscribe) {
			if (!participant.isSubscribed.video && participant.producerIds.video) {
				await this.subscribeToVideo(participant);
			}
			if (!participant.isSubscribed.screen && participant.producerIds.screen) {
				await this.subscribeToScreen(participant);
			}
		}

		// Unsubscribe from low-priority streams
		for (const participant of streamsToUnsubscribe) {
			if (participant.isSubscribed.video && participant.producerIds.video) {
				await this.unsubscribeFromVideo(participant);
			}
			if (participant.isSubscribed.screen && participant.producerIds.screen) {
				await this.unsubscribeFromScreen(participant);
			}
		}
	}

	/**
	 * Subscribe to audio stream
	 */
	private async subscribeToAudio(participant: ParticipantStream): Promise<void> {
		if (!participant.producerIds.audio) return;

		try {
			// Request consumer from SFU
			this.sfuClient.getSocket().emit('consume', {
				producerId: participant.producerIds.audio,
			});

			participant.isSubscribed.audio = true;
			console.log(`[BandwidthManager] Subscribed to audio: ${participant.userId}`);
		} catch (error) {
			console.error(`[BandwidthManager] Error subscribing to audio:`, error);
		}
	}

	/**
	 * Subscribe to video stream
	 */
	private async subscribeToVideo(participant: ParticipantStream): Promise<void> {
		if (!participant.producerIds.video) return;

		try {
			this.sfuClient.getSocket().emit('consume', {
				producerId: participant.producerIds.video,
			});

			participant.isSubscribed.video = true;
			console.log(`[BandwidthManager] Subscribed to video: ${participant.userId}`);
		} catch (error) {
			console.error(`[BandwidthManager] Error subscribing to video:`, error);
		}
	}

	/**
	 * Subscribe to screen share
	 */
	private async subscribeToScreen(participant: ParticipantStream): Promise<void> {
		if (!participant.producerIds.screen) return;

		try {
			this.sfuClient.getSocket().emit('consume', {
				producerId: participant.producerIds.screen,
			});

			participant.isSubscribed.screen = true;
			console.log(`[BandwidthManager] Subscribed to screen: ${participant.userId}`);
		} catch (error) {
			console.error(`[BandwidthManager] Error subscribing to screen:`, error);
		}
	}

	/**
	 * Unsubscribe from video
	 */
	private async unsubscribeFromVideo(participant: ParticipantStream): Promise<void> {
		if (!participant.producerIds.video) return;

		try {
			this.sfuClient.getSocket().emit('close-consumer', {
				producerId: participant.producerIds.video,
			});

			participant.isSubscribed.video = false;
			console.log(`[BandwidthManager] Unsubscribed from video: ${participant.userId}`);
		} catch (error) {
			console.error(`[BandwidthManager] Error unsubscribing from video:`, error);
		}
	}

	/**
	 * Unsubscribe from screen
	 */
	private async unsubscribeFromScreen(participant: ParticipantStream): Promise<void> {
		if (!participant.producerIds.screen) return;

		try {
			this.sfuClient.getSocket().emit('close-consumer', {
				producerId: participant.producerIds.screen,
			});

			participant.isSubscribed.screen = false;
			console.log(`[BandwidthManager] Unsubscribed from screen: ${participant.userId}`);
		} catch (error) {
			console.error(`[BandwidthManager] Error unsubscribing from screen:`, error);
		}
	}

	/**
	 * Unsubscribe from all participant streams
	 */
	private async unsubscribeFromParticipant(participant: ParticipantStream): Promise<void> {
		if (participant.isSubscribed.audio && participant.producerIds.audio) {
			this.sfuClient.getSocket().emit('close-consumer', {
				producerId: participant.producerIds.audio,
			});
		}
		if (participant.isSubscribed.video && participant.producerIds.video) {
			await this.unsubscribeFromVideo(participant);
		}
		if (participant.isSubscribed.screen && participant.producerIds.screen) {
			await this.unsubscribeFromScreen(participant);
		}
	}

	/**
	 * Update bandwidth estimate
	 */
	updateBandwidth(bandwidth: number): void {
		this.currentBandwidth = bandwidth;
		
		// Adjust max video streams based on available bandwidth
		// Estimate: ~1.5 Mbps per video stream
		const estimatedStreams = Math.floor(bandwidth / 1500000);
		this.maxVideoStreams = Math.min(
			estimatedStreams,
			this.options.maxSubscribedVideoStreams
		);

		this.updateSubscriptions();
	}

	/**
	 * Get subscription status
	 */
	getSubscriptions(): Map<string, ParticipantStream> {
		return new Map(this.participants);
	}
}

