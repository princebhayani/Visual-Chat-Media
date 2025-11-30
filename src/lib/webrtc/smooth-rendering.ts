/**
 * Smooth Rendering with requestVideoFrameCallback
 * 
 * Optimizes video rendering for smooth playback
 * Uses requestVideoFrameCallback for frame-synchronized rendering
 */

export interface SmoothRenderingOptions {
	onFrame?: (timestamp: number, metadata?: VideoFrameCallbackMetadata) => void;
	maxFrameSkip?: number; // Maximum frames to skip before dropping
}

export class SmoothRenderingController {
	private videoElement: HTMLVideoElement;
	private callbackId: number | null = null;
	private isActive = false;
	private frameCount = 0;
	private droppedFrames = 0;
	private lastFrameTime = 0;
	private options: SmoothRenderingOptions;

	constructor(
		videoElement: HTMLVideoElement,
		options: SmoothRenderingOptions = {}
	) {
		this.videoElement = videoElement;
		this.options = {
			maxFrameSkip: options.maxFrameSkip || 2,
			onFrame: options.onFrame,
		};
	}

	/**
	 * Start smooth rendering
	 */
	start(): void {
		if (this.isActive || !this.isSupported()) {
			return;
		}

		this.isActive = true;
		this.frameCount = 0;
		this.droppedFrames = 0;
		this.lastFrameTime = 0;

		this.scheduleNextFrame();
	}

	/**
	 * Stop smooth rendering
	 */
	stop(): void {
		if (this.callbackId !== null) {
			this.videoElement.cancelVideoFrameCallback(this.callbackId);
			this.callbackId = null;
		}
		this.isActive = false;
	}

	/**
	 * Check if requestVideoFrameCallback is supported
	 */
	isSupported(): boolean {
		return 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
	}

	/**
	 * Schedule next frame callback
	 */
	private scheduleNextFrame(): void {
		if (!this.isActive) return;

		this.callbackId = this.videoElement.requestVideoFrameCallback(
			(timestamp, metadata) => {
				this.handleFrame(timestamp, metadata);
			}
		);
	}

	/**
	 * Handle video frame
	 */
	private handleFrame(
		timestamp: number,
		metadata?: VideoFrameCallbackMetadata
	): void {
		if (!this.isActive) return;

		this.frameCount++;

		// Calculate frame rate
		const deltaTime = this.lastFrameTime > 0 ? timestamp - this.lastFrameTime : 0;
		const frameRate = deltaTime > 0 ? 1000 / deltaTime : 0;

		this.lastFrameTime = timestamp;

		// Check for dropped frames
		if (metadata && 'expectedDisplayTime' in metadata) {
			const expectedTime = (metadata as any).expectedDisplayTime;
			if (expectedTime && Math.abs(timestamp - expectedTime) > 16.67) {
				// Frame is more than one frame late (assuming 60fps)
				this.droppedFrames++;
			}
		}

		// Call user callback
		if (this.options.onFrame) {
			try {
				this.options.onFrame(timestamp, metadata);
			} catch (error) {
				console.error('[SmoothRendering] Frame callback error:', error);
			}
		}

		// Schedule next frame
		this.scheduleNextFrame();
	}

	/**
	 * Get rendering statistics
	 */
	getStats(): {
		frameCount: number;
		droppedFrames: number;
		dropRate: number;
	} {
		return {
			frameCount: this.frameCount,
			droppedFrames: this.droppedFrames,
			dropRate: this.frameCount > 0 
				? (this.droppedFrames / this.frameCount) * 100 
				: 0,
		};
	}

	/**
	 * Reset statistics
	 */
	resetStats(): void {
		this.frameCount = 0;
		this.droppedFrames = 0;
		this.lastFrameTime = 0;
	}
}

/**
 * Setup smooth rendering for video element (convenience function)
 */
export function setupSmoothRendering(
	videoElement: HTMLVideoElement,
	options: SmoothRenderingOptions = {}
): () => void {
	const controller = new SmoothRenderingController(videoElement, options);
	
	if (controller.isSupported()) {
		controller.start();
		
		// Return cleanup function
		return () => {
			controller.stop();
		};
	} else {
		// Fallback: Use requestAnimationFrame
		let animationFrameId: number;
		
		const render = () => {
			options.onFrame?.(performance.now());
			animationFrameId = requestAnimationFrame(render);
		};
		
		animationFrameId = requestAnimationFrame(render);
		
		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	}
}

