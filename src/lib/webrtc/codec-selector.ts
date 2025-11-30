/**
 * Codec Selector
 * 
 * Selects optimal codec based on device capabilities and requirements
 */

export type CodecType = 'VP8' | 'VP9' | 'H264' | 'AV1';

export interface CodecInfo {
	mimeType: string;
	type: CodecType;
	sdpFmtpLine?: string;
	preferredPayloadType?: number;
}

export interface CodecSelectionOptions {
	preferHardware?: boolean;
	preferQuality?: boolean;
	preferEfficiency?: boolean;
	forceCodec?: CodecType;
}

/**
 * Get codec type from MIME type
 */
function getCodecType(mimeType: string): CodecType | null {
	if (mimeType.includes('vp8')) return 'VP8';
	if (mimeType.includes('vp9')) return 'VP9';
	if (mimeType.includes('h264') || mimeType.includes('avc1')) return 'H264';
	if (mimeType.includes('av1')) return 'AV1';
	return null;
}

/**
 * Get available codecs for video
 */
export function getAvailableCodecs(): CodecInfo[] {
	try {
		const capabilities = RTCRtpSender.getCapabilities('video');
		if (!capabilities || !capabilities.codecs) {
			return [];
		}

		const codecs: CodecInfo[] = [];

		for (const codec of capabilities.codecs) {
			if (codec.mimeType.startsWith('video/')) {
				const type = getCodecType(codec.mimeType);
				if (type) {
					codecs.push({
						mimeType: codec.mimeType,
						type,
						sdpFmtpLine: codec.sdpFmtpLine,
						preferredPayloadType: codec.preferredPayloadType,
					});
				}
			}
		}

		return codecs;
	} catch (error) {
		console.error('[CodecSelector] Error getting codecs:', error);
		return [];
	}
}

/**
 * Select optimal codec based on options
 */
export function selectCodec(options: CodecSelectionOptions = {}): CodecInfo | null {
	const availableCodecs = getAvailableCodecs();
	if (availableCodecs.length === 0) {
		return null;
	}

	// Force codec if specified
	if (options.forceCodec) {
		const codec = availableCodecs.find((c) => c.type === options.forceCodec);
		if (codec) {
			return codec;
		}
		console.warn(`[CodecSelector] Forced codec ${options.forceCodec} not available`);
	}

	// Priority order based on preferences
	let priorityOrder: CodecType[];

	if (options.preferHardware) {
		// H.264 has best hardware support
		priorityOrder = ['H264', 'VP8', 'VP9', 'AV1'];
	} else if (options.preferQuality) {
		// VP9 has best compression/quality
		priorityOrder = ['VP9', 'H264', 'AV1', 'VP8'];
	} else if (options.preferEfficiency) {
		// VP9/AV1 have best compression
		priorityOrder = ['VP9', 'AV1', 'H264', 'VP8'];
	} else {
		// Default: H.264 for best balance
		priorityOrder = ['H264', 'VP9', 'VP8', 'AV1'];
	}

	// Find first available codec in priority order
	for (const codecType of priorityOrder) {
		const codec = availableCodecs.find((c) => c.type === codecType);
		if (codec) {
			return codec;
		}
	}

	// Fallback to first available
	return availableCodecs[0];
}

/**
 * Check if hardware acceleration is available for a codec
 */
export async function isHardwareAccelerated(codec: CodecInfo): Promise<boolean> {
	// H.264 typically has hardware acceleration on most devices
	if (codec.type === 'H264') {
		return true; // Assume available, browser will use if possible
	}

	// VP8/VP9 are typically software-encoded
	if (codec.type === 'VP8' || codec.type === 'VP9') {
		return false;
	}

	// AV1 may have hardware support on newer devices
	if (codec.type === 'AV1') {
		// Check if device is recent (rough heuristic)
		return false; // Conservative
	}

	return false;
}

/**
 * Get codec recommendation based on device type
 */
export function getRecommendedCodec(
	deviceType: 'desktop' | 'mobile' = 'desktop'
): CodecInfo | null {
	const options: CodecSelectionOptions = {
		preferHardware: true, // Prefer hardware on both, but especially mobile
	};

	if (deviceType === 'mobile') {
		// Mobile: prioritize hardware acceleration for battery
		options.preferHardware = true;
		options.preferEfficiency = false; // Battery > compression
	} else {
		// Desktop: balance between quality and efficiency
		options.preferHardware = true;
		options.preferQuality = true;
	}

	return selectCodec(options);
}

/**
 * Set codec preference for peer connection
 */
export async function setCodecPreference(
	peerConnection: RTCPeerConnection,
	codec: CodecInfo
): Promise<boolean> {
	try {
		const transceivers = peerConnection.getTransceivers();
		
		for (const transceiver of transceivers) {
			if (transceiver.sender && transceiver.sender.track?.kind === 'video') {
				const params = transceiver.sender.getParameters();
				
				if (!params.codecs) {
					params.codecs = [];
				}

				// Find codec in available codecs
				const capabilities = RTCRtpSender.getCapabilities('video');
				const selectedCodec = capabilities?.codecs.find(
					(c) => c.mimeType === codec.mimeType
				);

				if (selectedCodec) {
					// Move preferred codec to front
					params.codecs = params.codecs.filter((c) => c.mimeType !== codec.mimeType);
					params.codecs.unshift(selectedCodec);

					await transceiver.sender.setParameters(params);
					console.log(`[CodecSelector] Set codec preference: ${codec.type}`);
					return true;
				}
			}
		}

		return false;
	} catch (error) {
		console.error('[CodecSelector] Error setting codec preference:', error);
		return false;
	}
}

/**
 * Get codec statistics
 */
export async function getCodecStats(
	peerConnection: RTCPeerConnection
): Promise<{ codec: string; type: CodecType | null } | null> {
	try {
		const stats = await peerConnection.getStats();
		
		for (const [_, stat] of stats) {
			if (stat.type === 'outbound-rtp' || stat.type === 'inbound-rtp') {
				const rtpStat = stat as RTCOutboundRtpStreamStats | RTCInboundRtpStreamStats;
				if (rtpStat.codecId) {
					const codecStat = stats.get(rtpStat.codecId);
					if (codecStat && codecStat.type === 'codec') {
						const codec = codecStat as RTCCodecStats;
						const type = getCodecType(codec.mimeType);
						return {
							codec: codec.mimeType,
							type: type || null,
						};
					}
				}
			}
		}

		return null;
	} catch (error) {
		console.error('[CodecSelector] Error getting codec stats:', error);
		return null;
	}
}

