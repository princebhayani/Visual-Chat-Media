/**
 * Quality Manager
 * 
 * Centralized quality management for WebRTC calls
 * Coordinates adaptive bitrate, network monitoring, and constraint adjustment
 */

import { VideoQuality, getVideoCallConstraints, adjustConstraintsForNetwork } from './media-constraints';
import { AdaptiveBitrateController } from './adaptive-bitrate';
import { NetworkMonitor, NetworkQuality } from './network-monitor';
import { MediaHandler } from './media-handler';
import { PeerConnectionManager } from './connection-manager';

export interface QualityManagerOptions {
	initialQuality?: VideoQuality;
	minQuality?: VideoQuality;
	maxQuality?: VideoQuality;
	enableAdaptiveBitrate?: boolean;
	enableNetworkMonitoring?: boolean;
	adjustmentInterval?: number;
}

export class QualityManager {
	private peerConnectionManager: PeerConnectionManager;
	private mediaHandler: MediaHandler;
	private adaptiveBitrateControllers: Map<string, AdaptiveBitrateController> = new Map();
	private networkMonitors: Map<string, NetworkMonitor> = new Map();
	private currentQuality: VideoQuality;
	private minQuality: VideoQuality;
	private maxQuality: VideoQuality;
	private enableAdaptiveBitrate: boolean;
	private enableNetworkMonitoring: boolean;

	constructor(
		peerConnectionManager: PeerConnectionManager,
		mediaHandler: MediaHandler,
		options: QualityManagerOptions = {}
	) {
		this.peerConnectionManager = peerConnectionManager;
		this.mediaHandler = mediaHandler;
		this.currentQuality = options.initialQuality || VideoQuality.High;
		this.minQuality = options.minQuality || VideoQuality.Low;
		this.maxQuality = options.maxQuality || VideoQuality.HD;
		this.enableAdaptiveBitrate = options.enableAdaptiveBitrate !== false;
		this.enableNetworkMonitoring = options.enableNetworkMonitoring !== false;
	}

	/**
	 * Initialize quality management for a peer connection
	 */
	async initializeForPeer(socketId: string): Promise<void> {
		const peerConnection = this.peerConnectionManager.getPeerConnection();
		if (!peerConnection) {
			throw new Error('Peer connection not available');
		}

		// Setup adaptive bitrate
		if (this.enableAdaptiveBitrate) {
			const senders = peerConnection.getSenders();
			const videoSender = senders.find((s) => s.track?.kind === 'video');

			if (videoSender) {
				const controller = new AdaptiveBitrateController(
					videoSender,
					peerConnection,
					{
						initialQuality: this.currentQuality,
						minQuality: this.minQuality,
						maxQuality: this.maxQuality,
					}
				);

				await controller.start();
				this.adaptiveBitrateControllers.set(socketId, controller);
			}
		}

		// Setup network monitoring
		if (this.enableNetworkMonitoring) {
			const monitor = new NetworkMonitor(peerConnection);
			monitor.start();

			// Subscribe to quality changes
			monitor.onQualityChange((metrics) => {
				this.handleNetworkQualityChange(socketId, metrics.quality);
			});

			this.networkMonitors.set(socketId, monitor);
		}
	}

	/**
	 * Handle network quality changes
	 */
	private async handleNetworkQualityChange(socketId: string, quality: NetworkQuality): Promise<void> {
		// Adjust constraints based on network
		const newQuality = adjustConstraintsForNetwork(this.currentQuality, quality);

		if (newQuality !== this.currentQuality) {
			await this.setQuality(newQuality, socketId);
		}
	}

	/**
	 * Set quality level for all peers
	 */
	async setQuality(quality: VideoQuality, socketId?: string): Promise<void> {
		// Update current quality
		this.currentQuality = quality;

		// Update adaptive bitrate controllers
		if (socketId) {
			const controller = this.adaptiveBitrateControllers.get(socketId);
			if (controller) {
				await controller.setQuality(quality);
			}
		} else {
			// Update all controllers
			for (const [id, controller] of this.adaptiveBitrateControllers) {
				await controller.setQuality(quality);
			}
		}

		// Update local video track constraints
		await this.updateLocalVideoConstraints(quality);
	}

	/**
	 * Update local video track constraints
	 */
	private async updateLocalVideoConstraints(quality: VideoQuality): Promise<void> {
		const videoTrack = this.mediaHandler.getVideoTrack();
		if (!videoTrack) {
			return;
		}

		const constraints = getVideoCallConstraints(quality);
		if (constraints.video) {
			try {
				await videoTrack.applyConstraints(constraints.video);
				console.log(`[QualityManager] Updated video constraints for quality: ${quality}`);
			} catch (error) {
				console.error('[QualityManager] Error updating constraints:', error);
			}
		}
	}

	/**
	 * Get current quality
	 */
	getCurrentQuality(): VideoQuality {
		return this.currentQuality;
	}

	/**
	 * Get network quality for a peer
	 */
	async getNetworkQuality(socketId: string): Promise<NetworkQuality | null> {
		const monitor = this.networkMonitors.get(socketId);
		if (!monitor) {
			return null;
		}

		const metrics = await monitor.getCurrentMetrics();
		return metrics?.quality || null;
	}

	/**
	 * Get adaptive bitrate stats for a peer
	 */
	getBitrateStats(socketId: string) {
		const controller = this.adaptiveBitrateControllers.get(socketId);
		if (!controller) {
			return null;
		}

		return {
			quality: controller.getCurrentQuality(),
			bitrate: controller.getBitrateConfig(),
			stats: controller.getStats(),
		};
	}

	/**
	 * Cleanup for a peer
	 */
	cleanupForPeer(socketId: string): void {
		const controller = this.adaptiveBitrateControllers.get(socketId);
		if (controller) {
			controller.stop();
			this.adaptiveBitrateControllers.delete(socketId);
		}

		const monitor = this.networkMonitors.get(socketId);
		if (monitor) {
			monitor.stop();
			this.networkMonitors.delete(socketId);
		}
	}

	/**
	 * Cleanup all
	 */
	cleanup(): void {
		this.adaptiveBitrateControllers.forEach((controller) => controller.stop());
		this.adaptiveBitrateControllers.clear();

		this.networkMonitors.forEach((monitor) => monitor.stop());
		this.networkMonitors.clear();
	}
}

