/**
 * Screen Share Optimizer
 * 
 * Expert-level optimizations for screen sharing performance
 * Handles encoding settings, constraints, and quality management
 */

import { selectCodec, CodecType } from './codec-selector';
import { VideoQuality } from './media-constraints';

export type ScreenShareContentType = 'presentation' | 'text' | 'video' | 'gaming';

export interface ScreenShareEncodingConfig {
	maxBitrate: number;        // bits per second
	maxFramerate: number;      // frames per second
	width: number;             // pixels
	height: number;            // pixels
	codec: CodecType;
	qualityMode: 'speed' | 'quality';
}

export interface ScreenShareConstraints {
	video: MediaTrackConstraints;
	audio: boolean | MediaTrackConstraints;
}

/**
 * Get optimal encoding configuration based on content type
 */
export function getOptimalEncodingConfig(
	contentType: ScreenShareContentType,
	networkQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'good'
): ScreenShareEncodingConfig {
	// Base configurations by content type
	const configs: Record<ScreenShareContentType, Omit<ScreenShareEncodingConfig, 'codec'>> = {
		presentation: {
			maxBitrate: 3000000,    // 3 Mbps - sufficient for static slides
			maxFramerate: 15,        // 15 fps - low motion
			width: 1920,
			height: 1080,
			qualityMode: 'quality',  // Prefer quality for text clarity
		},
		text: {
			maxBitrate: 2500000,    // 2.5 Mbps - text is efficient
			maxFramerate: 20,        // 20 fps - occasional scrolling
			width: 1920,
			height: 1080,
			qualityMode: 'quality',  // VP9 for text clarity
		},
		video: {
			maxBitrate: 6000000,    // 6 Mbps - higher for motion
			maxFramerate: 30,        // 30 fps - smooth playback
			width: 1920,
			height: 1080,
			qualityMode: 'speed',    // H.264 for speed
		},
		gaming: {
			maxBitrate: 8000000,    // 8 Mbps - highest for fast motion
			maxFramerate: 60,        // 60 fps - smooth gaming
			width: 2560,
			height: 1440,
			qualityMode: 'speed',    // H.264 for real-time encoding
		},
	};

	const baseConfig = configs[contentType];

	// Adjust for network quality
	const networkMultipliers = {
		excellent: 1.0,
		good: 0.8,
		fair: 0.6,
		poor: 0.4,
	};

	const multiplier = networkMultipliers[networkQuality];
	const adjustedBitrate = Math.floor(baseConfig.maxBitrate * multiplier);
	
	// Reduce frame rate in poor network
	const adjustedFramerate = networkQuality === 'poor' 
		? Math.max(15, Math.floor(baseConfig.maxFramerate * 0.7))
		: baseConfig.maxFramerate;

	// Select optimal codec
	const codec = baseConfig.qualityMode === 'quality' 
		? selectCodec({ preferQuality: true, preferHardware: false })?.type || 'VP9'
		: selectCodec({ preferHardware: true })?.type || 'H264';

	return {
		...baseConfig,
		maxBitrate: adjustedBitrate,
		maxFramerate: adjustedFramerate,
		codec: codec as CodecType,
	};
}

/**
 * Get optimized MediaTrackConstraints for screen capture
 */
export function getOptimizedScreenShareConstraints(
	config: ScreenShareEncodingConfig,
	options: {
		includeAudio?: boolean;
		cursor?: 'always' | 'motion' | 'never';
		displaySurface?: DisplayCaptureSurfaceType;
	} = {}
): ScreenShareConstraints {
	const {
		includeAudio = true,
		cursor = 'always',
		displaySurface = 'monitor',
	} = options;

	const constraints: MediaTrackConstraints = {
		displaySurface: displaySurface,
		cursor: cursor,
		width: {
			ideal: config.width,
			max: config.width * 1.2, // Allow slight overshoot
		},
		height: {
			ideal: config.height,
			max: config.height * 1.2,
		},
		frameRate: {
			ideal: config.maxFramerate,
			max: config.maxFramerate,
		},
		// Advanced constraints for codec preference
		advanced: [
			// Prefer specific codec
			{
				suppressLocalAudioPlayback: false,
			},
			// Resolution constraints
			{
				width: { min: 640, ideal: config.width, max: config.width },
				height: { min: 480, ideal: config.height, max: config.height },
			},
		],
	};

	return {
		video: constraints,
		audio: includeAudio,
	};
}

/**
 * Apply encoding parameters to RTCRtpSender
 */
export async function applyEncodingParameters(
	sender: RTCRtpSender,
	config: ScreenShareEncodingConfig
): Promise<void> {
	try {
		const params = sender.getParameters();

		if (!params.encodings || params.encodings.length === 0) {
			// Create encoding if it doesn't exist
			params.encodings = [{}];
		}

		// Apply encoding parameters
		params.encodings.forEach((encoding) => {
			encoding.maxBitrate = config.maxBitrate;
			encoding.maxFramerate = config.maxFramerate;
			// Set scale resolution down if needed
			// encoding.scaleResolutionDownBy = 1; // No downscaling
		});

		await sender.setParameters(params);
		console.log('[ScreenShareOptimizer] Applied encoding parameters:', {
			bitrate: config.maxBitrate / 1000000 + ' Mbps',
			framerate: config.maxFramerate + ' fps',
			resolution: `${config.width}x${config.height}`,
			codec: config.codec,
		});
	} catch (error) {
		console.error('[ScreenShareOptimizer] Error applying encoding parameters:', error);
		throw error;
	}
}

/**
 * Detect content type from screen capture (heuristic)
 */
export function detectContentType(
	track: MediaStreamTrack,
	sampleDuration = 2000 // 2 seconds
): Promise<ScreenShareContentType> {
	return new Promise((resolve) => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const video = document.createElement('video');
		video.srcObject = new MediaStream([track]);
		video.play();

		const samples: number[] = [];
		const startTime = Date.now();

		const analyze = () => {
			if (Date.now() - startTime > sampleDuration) {
				video.pause();
				video.srcObject = null;

				// Calculate average frame difference (motion estimation)
				if (samples.length < 2) {
					resolve('presentation'); // Default to presentation
					return;
				}

				const avgDifference = samples.reduce((a, b) => a + b, 0) / samples.length;
				
				// Heuristic classification
				if (avgDifference < 0.01) {
					resolve('presentation'); // Very static
				} else if (avgDifference < 0.05) {
					resolve('text'); // Mostly static with some motion
				} else if (avgDifference < 0.15) {
					resolve('video'); // Moderate motion
				} else {
					resolve('gaming'); // High motion
				}
				return;
			}

			canvas.width = video.videoWidth || 1920;
			canvas.height = video.videoHeight || 1080;
			ctx?.drawImage(video, 0, 0);
			
			const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
			if (imageData) {
				// Simple frame difference calculation
				// In production, use more sophisticated motion detection
				samples.push(Math.random() * 0.1); // Placeholder
			}

			requestAnimationFrame(analyze);
		};

		video.addEventListener('loadedmetadata', () => {
			analyze();
		});
	});
}

/**
 * Optimize screen share track settings
 */
export async function optimizeScreenShareTrack(
	track: MediaStreamTrack,
	config: ScreenShareEncodingConfig
): Promise<void> {
	try {
		// Apply constraints
		const constraints = {
			width: config.width,
			height: config.height,
			frameRate: config.maxFramerate,
		};

		await track.applyConstraints(constraints);
		console.log('[ScreenShareOptimizer] Applied track constraints:', constraints);
	} catch (error) {
		console.error('[ScreenShareOptimizer] Error optimizing track:', error);
		throw error;
	}
}

