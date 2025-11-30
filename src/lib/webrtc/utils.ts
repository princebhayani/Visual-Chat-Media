/**
 * WebRTC Utilities
 * 
 * Helper functions for WebRTC operations
 */

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
	condition: () => boolean,
	timeout = 10000,
	interval = 100
): Promise<void> {
	const startTime = Date.now();

	return new Promise((resolve, reject) => {
		const check = () => {
			if (condition()) {
				resolve();
			} else if (Date.now() - startTime > timeout) {
				reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
			} else {
				setTimeout(check, interval);
			}
		};

		check();
	});
}

/**
 * Wait for signaling state
 */
export async function waitForSignalingState(
	peerConnection: RTCPeerConnection,
	targetState: RTCSignalingState,
	timeout = 10000
): Promise<void> {
	if (peerConnection.signalingState === targetState) {
		return;
	}

	return new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			peerConnection.removeEventListener('signalingstatechange', handler);
			reject(new Error(`Timeout waiting for signaling state: ${targetState}`));
		}, timeout);

		const handler = () => {
			if (peerConnection.signalingState === targetState) {
				peerConnection.removeEventListener('signalingstatechange', handler);
				clearTimeout(timeoutId);
				resolve();
			}
		};

		peerConnection.addEventListener('signalingstatechange', handler);
	});
}

/**
 * Wait for ICE connection state
 */
export async function waitForIceConnectionState(
	peerConnection: RTCPeerConnection,
	targetState: RTCIceConnectionState,
	timeout = 10000
): Promise<void> {
	if (peerConnection.iceConnectionState === targetState) {
		return;
	}

	return new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			peerConnection.removeEventListener('iceconnectionstatechange', handler);
			reject(new Error(`Timeout waiting for ICE connection state: ${targetState}`));
		}, timeout);

		const handler = () => {
			if (peerConnection.iceConnectionState === targetState) {
				peerConnection.removeEventListener('iceconnectionstatechange', handler);
				clearTimeout(timeoutId);
				resolve();
			}
		};

		peerConnection.addEventListener('iceconnectionstatechange', handler);
	});
}

/**
 * Get connection statistics
 */
export async function getConnectionStats(
	peerConnection: RTCPeerConnection
): Promise<RTCStatsReport | null> {
	try {
		return await peerConnection.getStats();
	} catch (error) {
		console.error('Error getting connection stats:', error);
		return null;
	}
}

/**
 * Parse connection type from ICE candidate
 */
export function getConnectionType(candidate: RTCIceCandidate): 'host' | 'srflx' | 'relay' | 'unknown' {
	if (!candidate.candidate) {
		return 'unknown';
	}

	if (candidate.candidate.includes('typ host')) {
		return 'host';
	} else if (candidate.candidate.includes('typ srflx')) {
		return 'srflx';
	} else if (candidate.candidate.includes('typ relay')) {
		return 'relay';
	}

	return 'unknown';
}

/**
 * Check if connection is using TURN
 */
export function isUsingTurn(stats: RTCStatsReport): boolean {
	for (const [_, stat] of Array.from(stats)) {
		if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
			const localCandidate = stats.get(stat.localCandidateId as string);
			const remoteCandidate = stats.get(stat.remoteCandidateId as string);

			if (localCandidate?.type === 'relay' || remoteCandidate?.type === 'relay') {
				return true;
			}
		}
	}

	return false;
}

/**
 * Format connection quality from stats
 */
export interface ConnectionQuality {
	packetLoss: number;
	jitter: number;
	rtt: number;
	bitrate: number;
	framerate?: number;
}

export async function getConnectionQuality(
	peerConnection: RTCPeerConnection
): Promise<ConnectionQuality | null> {
	try {
		const stats = await peerConnection.getStats();
		const quality: ConnectionQuality = {
			packetLoss: 0,
			jitter: 0,
			rtt: 0,
			bitrate: 0,
		};

		for (const [_, stat] of Array.from(stats)) {
			if (stat.type === 'inbound-rtp' || stat.type === 'outbound-rtp') {
				const rtpStat = stat as RTCInboundRtpStreamStats | RTCOutboundRtpStreamStats;
				
				if (rtpStat.packetsLost !== undefined && rtpStat.packetsReceived !== undefined) {
					const total = rtpStat.packetsLost + rtpStat.packetsReceived;
					if (total > 0) {
						quality.packetLoss = (rtpStat.packetsLost / total) * 100;
					}
				}

				if (rtpStat.jitter !== undefined) {
					quality.jitter = rtpStat.jitter;
				}

				if (rtpStat.bitrate !== undefined) {
					quality.bitrate = rtpStat.bitrate;
				}

				if (rtpStat.framesPerSecond !== undefined) {
					quality.framerate = rtpStat.framesPerSecond;
				}
			}

			if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
				const candidatePair = stat as RTCIceCandidatePairStats;
				if (candidatePair.currentRoundTripTime !== undefined) {
					quality.rtt = candidatePair.currentRoundTripTime * 1000; // Convert to ms
				}
			}
		}

		return quality;
	} catch (error) {
		console.error('Error getting connection quality:', error);
		return null;
	}
}

/**
 * Log connection statistics for debugging
 */
export async function logConnectionStats(peerConnection: RTCPeerConnection): Promise<void> {
	const stats = await getConnectionStats(peerConnection);
	if (!stats) return;

	console.log('=== Connection Statistics ===');
	
	const quality = await getConnectionQuality(peerConnection);
	if (quality) {
		console.log('Packet Loss:', quality.packetLoss.toFixed(2) + '%');
		console.log('Jitter:', quality.jitter.toFixed(2) + 'ms');
		console.log('RTT:', quality.rtt.toFixed(2) + 'ms');
		console.log('Bitrate:', (quality.bitrate / 1000).toFixed(2) + 'kbps');
		if (quality.framerate) {
			console.log('Framerate:', quality.framerate.toFixed(2) + 'fps');
		}
	}

	console.log('Using TURN:', isUsingTurn(stats));
	console.log('===========================');
}

