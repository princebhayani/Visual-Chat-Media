/**
 * Optimized Media Constraints
 * 
 * Provides optimized getUserMedia constraints for audio/video calls
 * Based on best practices from Zoom, Google Meet, and Webex
 */

export interface VideoConstraints extends MediaTrackConstraints {
	width?: ConstrainULong;
	height?: ConstrainULong;
	frameRate?: ConstrainDouble;
	aspectRatio?: ConstrainDouble;
	facingMode?: ConstrainDOMString;
	resizeMode?: ConstrainDOMString;
}

export interface AudioConstraints extends MediaTrackConstraints {
	echoCancellation?: boolean;
	noiseSuppression?: boolean;
	autoGainControl?: boolean;
	// Chrome-specific optimizations
	googEchoCancellation?: boolean;
	googAutoGainControl?: boolean;
	googNoiseSuppression?: boolean;
	googHighpassFilter?: boolean;
	googTypingNoiseDetection?: boolean;
	googNoiseReduction?: boolean;
}

export interface ScreenShareConstraints extends DisplayMediaStreamConstraints {
	video: {
		width?: ConstrainULong;
		height?: ConstrainULong;
		frameRate?: ConstrainDouble;
		displaySurface?: ConstrainDOMString;
		cursor?: ConstrainDOMString;
	};
	audio?: boolean | MediaTrackConstraints;
}

/**
 * Video quality levels
 */
export enum VideoQuality {
	Low = 'low',        // 320x240 @ 15fps, ~150 kbps
	Medium = 'medium',  // 640x480 @ 24fps, ~500 kbps
	High = 'high',      // 1280x720 @ 30fps, ~1.5 Mbps
	HD = 'hd',          // 1920x1080 @ 30fps, ~3 Mbps
	UltraHD = 'uhd',    // 3840x2160 @ 30fps, ~8 Mbps
}

/**
 * Get optimized audio constraints
 * 
 * Enables echo cancellation, noise suppression, and auto-gain control
 */
export function getAudioConstraints(enhanced = true): AudioConstraints {
	const base: AudioConstraints = {
		echoCancellation: true,
		noiseSuppression: true,
		autoGainControl: true,
		sampleRate: 48000, // High quality audio
		channelCount: 1,   // Mono for calls
	};

	if (enhanced) {
		// Chrome-specific enhancements
		return {
			...base,
			googEchoCancellation: true,
			googAutoGainControl: true,
			googNoiseSuppression: true,
			googHighpassFilter: true,
			googTypingNoiseDetection: true,
			googNoiseReduction: true,
		};
	}

	return base;
}

/**
 * Get optimized video constraints for a quality level
 */
export function getVideoConstraints(
	quality: VideoQuality,
	deviceType: 'desktop' | 'mobile' = 'desktop'
): VideoConstraints {
	const constraints: Record<VideoQuality, VideoConstraints> = {
		[VideoQuality.Low]: {
			width: { ideal: 320, max: 640 },
			height: { ideal: 240, max: 480 },
			frameRate: { ideal: 15, max: 20 },
			aspectRatio: { ideal: 16 / 9 },
		},
		[VideoQuality.Medium]: {
			width: { ideal: 640, max: 1280 },
			height: { ideal: 480, max: 720 },
			frameRate: { ideal: 24, max: 30 },
			aspectRatio: { ideal: 16 / 9 },
		},
		[VideoQuality.High]: {
			width: { ideal: 1280, max: 1920 },
			height: { ideal: 720, max: 1080 },
			frameRate: { ideal: 30, max: 30 },
			aspectRatio: { ideal: 16 / 9 },
		},
		[VideoQuality.HD]: {
			width: { ideal: 1920, max: 2560 },
			height: { ideal: 1080, max: 1440 },
			frameRate: { ideal: 30, max: 30 },
			aspectRatio: { ideal: 16 / 9 },
		},
		[VideoQuality.UltraHD]: {
			width: { ideal: 3840, max: 3840 },
			height: { ideal: 2160, max: 2160 },
			frameRate: { ideal: 30, max: 30 },
			aspectRatio: { ideal: 16 / 9 },
		},
	};

	const base = constraints[quality];

	// Mobile-specific optimizations
	if (deviceType === 'mobile') {
		return {
			...base,
			// Limit mobile to 720p max
			width: quality === VideoQuality.HD || quality === VideoQuality.UltraHD
				? { ideal: 1280, max: 1280 }
				: base.width,
			height: quality === VideoQuality.HD || quality === VideoQuality.UltraHD
				? { ideal: 720, max: 720 }
				: base.height,
			facingMode: { ideal: 'user' },
		};
	}

	return base;
}

/**
 * Get default video constraints (High quality - 720p)
 */
export function getDefaultVideoConstraints(
	deviceType: 'desktop' | 'mobile' = 'desktop'
): VideoConstraints {
	return getVideoConstraints(VideoQuality.High, deviceType);
}

/**
 * Get optimized screen share constraints
 */
export function getScreenShareConstraints(
	options: {
		quality?: 'standard' | 'high' | 'ultra';
		includeAudio?: boolean;
		cursor?: 'always' | 'motion' | 'never';
		maxFrameRate?: number;
	} = {}
): ScreenShareConstraints {
	const { quality = 'high', includeAudio = true, cursor = 'always', maxFrameRate = 30 } = options;

	const qualitySettings = {
		standard: {
			width: { ideal: 1280, max: 1920 },
			height: { ideal: 720, max: 1080 },
			frameRate: { ideal: 24, max: maxFrameRate },
		},
		high: {
			width: { ideal: 1920, max: 2560 },
			height: { ideal: 1080, max: 1440 },
			frameRate: { ideal: 30, max: maxFrameRate },
		},
		ultra: {
			width: { ideal: 2560, max: 3840 },
			height: { ideal: 1440, max: 2160 },
			frameRate: { ideal: 60, max: maxFrameRate || 60 },
		},
	};

	return {
		video: {
			...qualitySettings[quality],
			displaySurface: 'monitor',
			cursor: cursor,
		} as MediaTrackConstraints,
		audio: includeAudio,
	};
}

/**
 * Get bitrate recommendations for quality level
 */
export function getBitrateForQuality(quality: VideoQuality): {
	min: number;
	max: number;
	target: number;
} {
	const bitrates: Record<VideoQuality, { min: number; max: number; target: number }> = {
		[VideoQuality.Low]: {
			min: 100000,    // 100 kbps
			max: 200000,    // 200 kbps
			target: 150000, // 150 kbps
		},
		[VideoQuality.Medium]: {
			min: 400000,    // 400 kbps
			max: 800000,    // 800 kbps
			target: 500000, // 500 kbps
		},
		[VideoQuality.High]: {
			min: 1200000,   // 1.2 Mbps
			max: 2000000,   // 2 Mbps
			target: 1500000, // 1.5 Mbps
		},
		[VideoQuality.HD]: {
			min: 2500000,   // 2.5 Mbps
			max: 4000000,   // 4 Mbps
			target: 3000000, // 3 Mbps
		},
		[VideoQuality.UltraHD]: {
			min: 6000000,   // 6 Mbps
			max: 12000000,  // 12 Mbps
			target: 8000000, // 8 Mbps
		},
	};

	return bitrates[quality];
}

/**
 * Get frame rate for quality level
 */
export function getFrameRateForQuality(quality: VideoQuality): {
	min: number;
	max: number;
	target: number;
} {
	const frameRates: Record<VideoQuality, { min: number; max: number; target: number }> = {
		[VideoQuality.Low]: { min: 10, max: 20, target: 15 },
		[VideoQuality.Medium]: { min: 20, max: 30, target: 24 },
		[VideoQuality.High]: { min: 24, max: 30, target: 30 },
		[VideoQuality.HD]: { min: 24, max: 30, target: 30 },
		[VideoQuality.UltraHD]: { min: 24, max: 30, target: 30 },
	};

	return frameRates[quality];
}

/**
 * Detect device type
 */
export function detectDeviceType(): 'desktop' | 'mobile' {
	if (typeof window === 'undefined') return 'desktop';

	const userAgent = navigator.userAgent.toLowerCase();
	const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
	return isMobile ? 'mobile' : 'desktop';
}

/**
 * Get optimized constraints for video call
 */
export function getVideoCallConstraints(
	quality: VideoQuality = VideoQuality.High,
	options: {
		audio?: boolean;
		enhancedAudio?: boolean;
		deviceType?: 'desktop' | 'mobile';
	} = {}
): MediaStreamConstraints {
	const deviceType = options.deviceType || detectDeviceType();

	return {
		audio: options.audio !== false ? getAudioConstraints(options.enhancedAudio !== false) : false,
		video: getVideoConstraints(quality, deviceType),
	};
}

/**
 * Get optimized constraints for audio call
 */
export function getAudioCallConstraints(enhanced = true): MediaStreamConstraints {
	return {
		audio: getAudioConstraints(enhanced),
		video: false,
	};
}

/**
 * Adjust constraints dynamically based on network conditions
 */
export function adjustConstraintsForNetwork(
	currentQuality: VideoQuality,
	networkQuality: 'excellent' | 'good' | 'fair' | 'poor'
): VideoQuality {
	// Network quality to video quality mapping
	const qualityMap: Record<string, VideoQuality[]> = {
		poor: [VideoQuality.Low, VideoQuality.Medium],
		fair: [VideoQuality.Medium, VideoQuality.High],
		good: [VideoQuality.High, VideoQuality.HD],
		excellent: [VideoQuality.HD, VideoQuality.UltraHD],
	};

	const allowedQualities = qualityMap[networkQuality] || [VideoQuality.Medium];
	const currentIndex = Object.values(VideoQuality).indexOf(currentQuality);

	// If current quality is not in allowed range, adjust
	if (!allowedQualities.includes(currentQuality)) {
		// Find closest allowed quality
		const targetQuality = allowedQualities[0];
		return targetQuality;
	}

	return currentQuality;
}

