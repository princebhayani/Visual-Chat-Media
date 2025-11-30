/**
 * Adaptive Bitrate Controller
 * 
 * Dynamically adjusts video bitrate and frame rate based on network conditions
 * Uses RTCRtpSender.setParameters() for real-time adjustments
 */

import { VideoQuality, getBitrateForQuality, getFrameRateForQuality } from './media-constraints';
import { getConnectionQuality, ConnectionQuality } from './utils';

export interface BitrateConfig {
	min: number;
	max: number;
	target: number;
	current?: number;
}

export interface AdaptiveBitrateOptions {
	initialQuality?: VideoQuality;
	minQuality?: VideoQuality;
	maxQuality?: VideoQuality;
	adjustmentInterval?: number; // ms
	packetLossThreshold?: number; // percentage
	rttThreshold?: number; // ms
	jitterThreshold?: number; // ms
}

export class AdaptiveBitrateController {
	private sender: RTCRtpSender;
	private currentQuality: VideoQuality;
	private minQuality: VideoQuality;
	private maxQuality: VideoQuality;
	private adjustmentInterval: number;
	private packetLossThreshold: number;
	private rttThreshold: number;
	private jitterThreshold: number;
	private monitoringInterval: NodeJS.Timeout | null = null;
	private isMonitoring = false;
	private peerConnection: RTCPeerConnection;
	private stats: ConnectionQuality | null = null;
	private lastAdjustment = 0;
	private readonly minAdjustmentDelay = 5000; // 5 seconds between adjustments

	constructor(
		sender: RTCRtpSender,
		peerConnection: RTCPeerConnection,
		options: AdaptiveBitrateOptions = {}
	) {
		this.sender = sender;
		this.peerConnection = peerConnection;
		this.currentQuality = options.initialQuality || VideoQuality.High;
		this.minQuality = options.minQuality || VideoQuality.Low;
		this.maxQuality = options.maxQuality || VideoQuality.HD;
		this.adjustmentInterval = options.adjustmentInterval || 3000; // 3 seconds
		this.packetLossThreshold = options.packetLossThreshold || 5; // 5%
		this.rttThreshold = options.rttThreshold || 300; // 300ms
		this.jitterThreshold = options.jitterThreshold || 50; // 50ms
	}

	/**
	 * Start monitoring and adjusting bitrate
	 */
	async start(): Promise<void> {
		if (this.isMonitoring) {
			return;
		}

		this.isMonitoring = true;
		
		// Set initial bitrate
		await this.setBitrate(this.currentQuality);

		// Start monitoring loop
		this.monitoringInterval = setInterval(async () => {
			await this.monitorAndAdjust();
		}, this.adjustmentInterval);

		console.log('[AdaptiveBitrate] Started monitoring');
	}

	/**
	 * Stop monitoring
	 */
	stop(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}
		this.isMonitoring = false;
		console.log('[AdaptiveBitrate] Stopped monitoring');
	}

	/**
	 * Monitor connection quality and adjust bitrate
	 */
	private async monitorAndAdjust(): Promise<void> {
		// Prevent too frequent adjustments
		const now = Date.now();
		if (now - this.lastAdjustment < this.minAdjustmentDelay) {
			return;
		}

		try {
			// Get connection quality stats
			this.stats = await getConnectionQuality(this.peerConnection);
			if (!this.stats) {
				return;
			}

			// Determine network quality
			const networkQuality = this.assessNetworkQuality(this.stats);

			// Adjust quality based on network conditions
			await this.adjustQuality(networkQuality);
		} catch (error) {
			console.error('[AdaptiveBitrate] Error monitoring:', error);
		}
	}

	/**
	 * Assess network quality from stats
	 */
	private assessNetworkQuality(stats: ConnectionQuality): 'excellent' | 'good' | 'fair' | 'poor' {
		const { packetLoss, rtt, jitter } = stats;

		// Poor: High packet loss OR high RTT OR high jitter
		if (
			packetLoss > this.packetLossThreshold ||
			rtt > this.rttThreshold ||
			jitter > this.jitterThreshold
		) {
			return 'poor';
		}

		// Fair: Moderate issues
		if (
			packetLoss > 2 ||
			rtt > 200 ||
			jitter > 30
		) {
			return 'fair';
		}

		// Good: Minor issues
		if (
			packetLoss > 0.5 ||
			rtt > 100 ||
			jitter > 15
		) {
			return 'good';
		}

		// Excellent: All metrics good
		return 'excellent';
	}

	/**
	 * Adjust quality based on network conditions
	 */
	private async adjustQuality(networkQuality: 'excellent' | 'good' | 'fair' | 'poor'): Promise<void> {
		const qualityOrder: VideoQuality[] = [
			VideoQuality.Low,
			VideoQuality.Medium,
			VideoQuality.High,
			VideoQuality.HD,
			VideoQuality.UltraHD,
		];

		const currentIndex = qualityOrder.indexOf(this.currentQuality);
		let newQuality = this.currentQuality;

		// Adjust down for poor network
		if (networkQuality === 'poor' && currentIndex > 0) {
			// Reduce by one level
			newQuality = qualityOrder[currentIndex - 1];
			// Ensure we don't go below min
			if (qualityOrder.indexOf(newQuality) < qualityOrder.indexOf(this.minQuality)) {
				newQuality = this.minQuality;
			}
		}
		// Adjust up for excellent network (gradual)
		else if (networkQuality === 'excellent' && currentIndex < qualityOrder.length - 1) {
			// Only increase if we've been stable for a while
			// This prevents oscillation
			const nextQuality = qualityOrder[currentIndex + 1];
			if (qualityOrder.indexOf(nextQuality) <= qualityOrder.indexOf(this.maxQuality)) {
				// Check if conditions have been excellent for extended period
				// For now, we'll be conservative and only increase if already at high
				if (this.currentQuality === VideoQuality.High && nextQuality === VideoQuality.HD) {
					newQuality = nextQuality;
				}
			}
		}
		// For fair/good, maintain or slightly adjust
		else if (networkQuality === 'fair') {
			// If currently at high quality and network is fair, reduce to medium
			if (this.currentQuality === VideoQuality.High || this.currentQuality === VideoQuality.HD) {
				newQuality = VideoQuality.Medium;
			}
		}

		// Apply changes if quality changed
		if (newQuality !== this.currentQuality) {
			await this.setBitrate(newQuality);
			this.lastAdjustment = Date.now();
			console.log(`[AdaptiveBitrate] Quality adjusted: ${this.currentQuality} → ${newQuality} (${networkQuality} network)`);
		}
	}

	/**
	 * Set bitrate for a quality level
	 */
	async setBitrate(quality: VideoQuality): Promise<void> {
		try {
			const params = this.sender.getParameters();

			if (!params.encodings || params.encodings.length === 0) {
				console.warn('[AdaptiveBitrate] No encodings found');
				return;
			}

			const bitrate = getBitrateForQuality(quality);
			const frameRate = getFrameRateForQuality(quality);

			// Update all encodings (for simulcast)
			params.encodings.forEach((encoding) => {
				encoding.maxBitrate = bitrate.max;
				encoding.minBitrate = bitrate.min;
				encoding.maxFramerate = frameRate.max;
			});

			await this.sender.setParameters(params);
			this.currentQuality = quality;

			console.log(`[AdaptiveBitrate] Bitrate set: ${quality} (${bitrate.target / 1000}kbps, ${frameRate.target}fps)`);
		} catch (error) {
			console.error('[AdaptiveBitrate] Error setting bitrate:', error);
			throw error;
		}
	}

	/**
	 * Manually set quality
	 */
	async setQuality(quality: VideoQuality): Promise<void> {
		if (quality === this.currentQuality) {
			return;
		}

		// Ensure quality is within bounds
		const qualityOrder: VideoQuality[] = [
			VideoQuality.Low,
			VideoQuality.Medium,
			VideoQuality.High,
			VideoQuality.HD,
			VideoQuality.UltraHD,
		];

		const qualityIndex = qualityOrder.indexOf(quality);
		const minIndex = qualityOrder.indexOf(this.minQuality);
		const maxIndex = qualityOrder.indexOf(this.maxQuality);

		if (qualityIndex < minIndex || qualityIndex > maxIndex) {
			console.warn(`[AdaptiveBitrate] Quality ${quality} out of bounds, clamping`);
			return;
		}

		await this.setBitrate(quality);
	}

	/**
	 * Get current quality
	 */
	getCurrentQuality(): VideoQuality {
		return this.currentQuality;
	}

	/**
	 * Get current stats
	 */
	getStats(): ConnectionQuality | null {
		return this.stats;
	}

	/**
	 * Get bitrate configuration
	 */
	getBitrateConfig(): BitrateConfig {
		const bitrate = getBitrateForQuality(this.currentQuality);
		return {
			...bitrate,
			current: bitrate.target,
		};
	}

	/**
	 * Force immediate adjustment (for manual triggers)
	 */
	async forceAdjust(): Promise<void> {
		await this.monitorAndAdjust();
	}
}

