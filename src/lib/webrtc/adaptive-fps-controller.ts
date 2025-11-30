/**
 * Adaptive FPS Controller
 * 
 * Dynamically adjusts frame rate based on content type and performance
 */

import { ScreenShareContentType, getOptimalEncodingConfig } from './screen-share-optimizer';

export interface AdaptiveFPSOptions {
	contentType: ScreenShareContentType;
	minFPS?: number;
	maxFPS?: number;
	adjustmentInterval?: number; // ms
	performanceThreshold?: number; // frames dropped percentage
}

export class AdaptiveFPSController {
	private track: MediaStreamTrack;
	private sender: RTCRtpSender;
	private options: Required<AdaptiveFPSOptions>;
	private currentFPS: number;
	private monitoringInterval: NodeJS.Timeout | null = null;
	private frameCount = 0;
	private droppedFrames = 0;
	private lastCheck = Date.now();

	constructor(
		track: MediaStreamTrack,
		sender: RTCRtpSender,
		options: AdaptiveFPSOptions
	) {
		this.track = track;
		this.sender = sender;
		this.options = {
			minFPS: options.minFPS || 15,
			maxFPS: options.maxFPS || 60,
			adjustmentInterval: options.adjustmentInterval || 5000, // 5 seconds
			performanceThreshold: options.performanceThreshold || 5, // 5% dropped frames
			contentType: options.contentType,
		};

		// Get optimal FPS for content type
		const config = getOptimalEncodingConfig(this.options.contentType);
		this.currentFPS = Math.min(config.maxFramerate, this.options.maxFPS);
	}

	/**
	 * Start adaptive FPS monitoring
	 */
	async start(): Promise<void> {
		// Set initial FPS
		await this.setFPS(this.currentFPS);

		// Start monitoring
		this.monitoringInterval = setInterval(async () => {
			await this.monitorAndAdjust();
		}, this.options.adjustmentInterval);

		// Monitor frame stats
		this.startFrameMonitoring();
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
	 * Monitor performance and adjust FPS
	 */
	private async monitorAndAdjust(): Promise<void> {
		const now = Date.now();
		const elapsed = (now - this.lastCheck) / 1000;

		if (elapsed < 1) return; // Need at least 1 second of data

		// Calculate frame drop percentage
		const expectedFrames = this.currentFPS * elapsed;
		const actualFrames = this.frameCount;
		const dropPercentage = ((expectedFrames - actualFrames) / expectedFrames) * 100;

		console.log('[AdaptiveFPS] Stats:', {
			expectedFrames: expectedFrames.toFixed(1),
			actualFrames,
			dropPercentage: dropPercentage.toFixed(1) + '%',
			currentFPS: this.currentFPS,
		});

		// Adjust FPS if performance is poor
		if (dropPercentage > this.options.performanceThreshold) {
			// Reduce FPS
			const newFPS = Math.max(
				this.options.minFPS,
				Math.floor(this.currentFPS * 0.9) // Reduce by 10%
			);

			if (newFPS !== this.currentFPS) {
				console.log(`[AdaptiveFPS] Reducing FPS: ${this.currentFPS} → ${newFPS} (${dropPercentage.toFixed(1)}% dropped)`);
				await this.setFPS(newFPS);
			}
		} else if (dropPercentage < 1 && this.currentFPS < this.options.maxFPS) {
			// Can increase FPS if performance is good
			const config = getOptimalEncodingConfig(this.options.contentType);
			const targetFPS = Math.min(config.maxFramerate, this.options.maxFPS);
			
			if (this.currentFPS < targetFPS) {
				const newFPS = Math.min(
					targetFPS,
					Math.ceil(this.currentFPS * 1.1) // Increase by 10%
				);

				if (newFPS !== this.currentFPS) {
					console.log(`[AdaptiveFPS] Increasing FPS: ${this.currentFPS} → ${newFPS}`);
					await this.setFPS(newFPS);
				}
			}
		}

		// Reset counters
		this.frameCount = 0;
		this.droppedFrames = 0;
		this.lastCheck = now;
	}

	/**
	 * Set FPS for track and sender
	 */
	private async setFPS(fps: number): Promise<void> {
		try {
			// Update track constraints
			await this.track.applyConstraints({
				frameRate: { ideal: fps, max: fps },
			});

			// Update sender encoding parameters
			const params = this.sender.getParameters();
			if (params.encodings && params.encodings.length > 0) {
				params.encodings.forEach((encoding) => {
					encoding.maxFramerate = fps;
				});
				await this.sender.setParameters(params);
			}

			this.currentFPS = fps;
			console.log(`[AdaptiveFPS] ✅ FPS set to ${fps}`);
		} catch (error) {
			console.error('[AdaptiveFPS] Error setting FPS:', error);
		}
	}

	/**
	 * Start monitoring frame statistics
	 */
	private startFrameMonitoring(): void {
		// Monitor using requestVideoFrameCallback if available
		if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
			// This would require a video element
			// For now, we'll use a simplified approach
		}

		// Alternative: Monitor track readyState and constraints
		// Track frame rate changes will be reflected in constraints
	}

	/**
	 * Get current FPS
	 */
	getCurrentFPS(): number {
		return this.currentFPS;
	}

	/**
	 * Manually set content type and update FPS
	 */
	async setContentType(contentType: ScreenShareContentType): Promise<void> {
		this.options.contentType = contentType;
		const config = getOptimalEncodingConfig(contentType);
		const targetFPS = Math.min(config.maxFramerate, this.options.maxFPS);
		await this.setFPS(targetFPS);
	}
}

