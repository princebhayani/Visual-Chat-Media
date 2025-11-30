/**
 * WebRTC Configuration
 * 
 * Provides optimized STUN server configuration for NAT traversal.
 * Uses free public STUN servers that don't require credentials.
 */

export interface IceServer {
	urls: string | string[];
	username?: string;
	credential?: string;
}

export interface WebRTCConfig {
	iceServers: IceServer[];
	iceTransportPolicy?: 'all' | 'relay';
	iceCandidatePoolSize?: number;
}

/**
 * Free STUN servers (public, no authentication required)
 */
const STUN_SERVERS: IceServer[] = [
	{ urls: 'stun:stun.l.google.com:19302' },
	{ urls: 'stun:stun1.l.google.com:19302' },
	{ urls: 'stun:stun2.l.google.com:19302' },
	{ urls: 'stun:stun3.l.google.com:19302' },
	{ urls: 'stun:stun4.l.google.com:19302' },
	{ urls: 'stun:stun.cloudflare.com:3478' },
	{ urls: 'stun:stun.stunprotocol.org:3478' },
];

/**
 * Get optimized ICE server configuration
 * 
 * Uses only STUN servers for NAT traversal and discovery.
 * STUN servers are free and don't require credentials.
 */
export async function getIceServers(): Promise<IceServer[]> {
	return STUN_SERVERS;
}

/**
 * Get WebRTC peer connection configuration
 */
export async function getWebRTCConfig(options?: {
	iceTransportPolicy?: 'all' | 'relay';
	forceRelay?: boolean;
}): Promise<RTCConfiguration> {
	const iceServers = await getIceServers();

	return {
		iceServers,
		iceTransportPolicy: options?.forceRelay ? 'relay' : options?.iceTransportPolicy || 'all',
		iceCandidatePoolSize: 10, // Pre-gather candidates for faster connection
	};
}

/**
 * Validate ICE server configuration
 */
export function validateIceServers(iceServers: IceServer[]): boolean {
	if (!Array.isArray(iceServers) || iceServers.length === 0) {
		console.error('No ICE servers configured');
		return false;
	}

	for (const server of iceServers) {
		if (!server.urls) {
			console.error('ICE server missing urls:', server);
			return false;
		}
	}

	return true;
}

