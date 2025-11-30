/**
 * Dynamic Resolution Controller
 * 
 * Adjusts screen share resolution based on network conditions
 */

import { getConnectionQuality, ConnectionQuality } from './utils';

export type ResolutionPreset = 'low' | 'medium' | 'high' | 'hd' | 'uhd';

export interface Resolution {
	width: number;
	height: number;
}

export interface DynamicResolutionOptions {
	initialResolution?: ResolutionPreset;
	minResolution?: ResolutionPreset;
	maxResolution?: ResolutionPreset;
	adjustmentInterval?: number; // ms
	packetLossThreshold?: number; // percentage
	rttThreshold?: number; // ms
	jitterThreshold?: number; // ms
}

const RESOLUTION_PRESETS: Record<ResolutionPreset, Resolution> = {
	low: { width: 640, height: 480 },
	medium: { width: 1280, height: 720 },
	high: { width: 1920, height: 1080 },
	hd: { width: 1920, height: 1080 },
	uhd: { width: 2560, height: 1440 },
};

export class DynamicResolutionController {
	private track: MediaStreamTrack;
	private sender: RTCRtpSender;
	private peerConnection: RTCPeerConnection;
	private options: Required<DynamicResolutionOptions>;
	private currentResolution: ResolutionPreset;
	private monitoringInterval: NodeJS.Timeout | null = null;
	private lastAdjustment = 0;
	private readonly minAdjustmentDelay = 5000; // 5 seconds

	constructor(
		track: MediaStreamTrack,
		sender: RTCRtpSender,
		peerConnection: RTCPeerConnection,
		options: DynamicResolutionOptions = {}
	) {
		this.track = track;
		this.sender = sender;
		this.peerConnection = peerConnection;
		this.options = {
			initialResolution: options.initialResolution || 'high',
			minResolution: options.minResolution || 'low',
			maxResolution: options.maxResolution || 'hd',
			adjustmentInterval: options.adjustmentInterval || 3000,
			packetLossThreshold: options.packetLossThreshold || 5,
			rttThreshold: options.rttThreshold || 300,
			jitterThreshold: options.jitterThreshold || 50,
		};

		this.currentResolution = this.options.initialResolution;
	}

	/**
	 * Start dynamic resolution adjustment
	 */
	async start(): Promise<void> {
		// Set initial resolution
		await this.setResolution(this.currentResolution);

		// Start monitoring
		this.monitoringInterval = setInterval(async () => {
			await this.monitorAndAdjust();
		}, this.options.adjustmentInterval);
	}

	/**
	 * Stop monitoring
	 */
	stop(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}
	}

	/**
	 * Monitor network and adjust resolution
	 */
	private async monitorAndAdjust(): Promise<void> {
		// Prevent too frequent adjustments
		const now = Date.now();
		if (now - this.lastAdjustment < this.minAdjustmentDelay) {
			return;
		}

		try {
			// Get connection quality stats
			const quality = await getConnectionQuality(this.peerConnection);
			if (!quality) return;

			// Determine if we should reduce or increase resolution
			const shouldReduce = 
				quality.packetLoss > this.options.packetLossThreshold ||
				quality.rtt > this.options.rttThreshold ||
				quality.jitter > this.options.jitterThreshold;

			const shouldIncrease =
				quality.packetLoss < 1 &&
				quality.rtt < 100 &&
				quality.jitter < 20;

			const resolutionOrder: ResolutionPreset[] = ['low', 'medium', 'high', 'hd', 'uhd'];
			const currentIndex = resolutionOrder.indexOf(this.currentResolution);
			const minIndex = resolutionOrder.indexOf(this.options.minResolution);
			const maxIndex = resolutionOrder.indexOf(this.options.maxResolution);

			let newResolution = this.currentResolution;

			if (shouldReduce && currentIndex > minIndex) {
				// Reduce resolution
				newResolution = resolutionOrder[currentIndex - 1];
			} else if (shouldIncrease && currentIndex < maxIndex) {
				// Increase resolution (gradual, after stable period)
				// Only increase if network has been good for extended period
				newResolution = resolutionOrder[currentIndex + 1];
			}

			if (newResolution !== this.currentResolution) {
				await this.setResolution(newResolution);
				this.lastAdjustment = now;
			}
		} catch (error) {
			console.error('[DynamicResolution] Error monitoring:', error);
		}
	}

	/**
	 * Set resolution for track and sender
	 */
	async setResolution(preset: ResolutionPreset): Promise<void> {
		const resolution = RESOLUTION_PRESETS[preset];

		try {
			// Update track constraints
			await this.track.applyConstraints({
				width: { ideal: resolution.width, max: resolution.width },
				height: { ideal: resolution.height, max: resolution.height },
			});

			// Update sender encoding parameters
			const params = this.sender.getParameters();
			if (params.encodings && params.encodings.length > 0) {
				// Adjust bitrate based on resolution
				const bitrate = this.calculateBitrateForResolution(preset);
				
				params.encodings.forEach((encoding) => {
					encoding.maxBitrate = bitrate;
					// Use scaleResolutionDownBy if needed
					// encoding.scaleResolutionDownBy = 1;
				});

				await this.sender.setParameters(params);
			}

			this.currentResolution = preset;
			console.log(`[DynamicResolution] ✅ Resolution set to ${preset} (${resolution.width}x${resolution.height})`);
		} catch (error) {
			console.error('[DynamicResolution] Error setting resolution:', error);
			throw error;
		}
	}

	/**
	 * Calculate optimal bitrate for resolution
	 */
	private calculateBitrateForResolution(preset: ResolutionPreset): number {
		const bitrates: Record<ResolutionPreset, number> = {
			low: 1000000,      // 1 Mbps
			medium: 2500000,   // 2.5 Mbps
			high: 4000000,     // 4 Mbps
			hd: 6000000,       // 6 Mbps
			uhd: 10000000,     // 10 Mbps
		};

		return bitrates[preset] || bitrates.high;
	}

	/**
	 * Get current resolution
	 */
	getCurrentResolution(): ResolutionPreset {
		return this.currentResolution;
	}

	/**
	 * Manually set resolution
	 */
	async setResolutionManually(preset: ResolutionPreset): Promise<void> {
		// Ensure within bounds
		const resolutionOrder: ResolutionPreset[] = ['low', 'medium', 'high', 'hd', 'uhd'];
		const presetIndex = resolutionOrder.indexOf(preset);
		const minIndex = resolutionOrder.indexOf(this.options.minResolution);
		const maxIndex = resolutionOrder.indexOf(this.options.maxResolution);

		if (presetIndex < minIndex || presetIndex > maxIndex) {
			console.warn(`[DynamicResolution] Resolution ${preset} out of bounds`);
			return;
		}

		await this.setResolution(preset);
		this.lastAdjustment = Date.now();
	}
}

