/**
 * SFU Client Service
 * 
 * Wrapper for SFU (Selective Forwarding Unit) communication
 * Supports mediasoup, LiveKit, and other SFU implementations
 */

import { io, Socket } from 'socket.io-client';

export type SFUType = 'mediasoup' | 'livekit' | 'custom';

export interface SFUConfig {
	type: SFUType;
	url: string;
	token: string;
	roomId: string;
}

export interface ProducerInfo {
	id: string;
	kind: 'audio' | 'video';
	userId: string;
	paused: boolean;
}

export interface ConsumerInfo {
	id: string;
	producerId: string;
	kind: 'audio' | 'video';
	userId: string;
	paused: boolean;
}

export interface TransportInfo {
	id: string;
	iceParameters: RTCIceParameters;
	iceCandidates: RTCIceCandidate[];
	dtlsParameters: RTCDtlsParameters;
}

export class SFUClient {
	private socket: Socket;
	private config: SFUConfig;
	private roomId: string;
	private transports: {
		send?: RTCRtpTransceiver;
		recv?: RTCRtpTransceiver;
	} = {};
	private producers: Map<string, RTCRtpSender> = new Map();
	private consumers: Map<string, RTCRtpReceiver> = new Map();
	private localStream: MediaStream | null = null;

	constructor(config: SFUConfig) {
		this.config = config;
		this.roomId = config.roomId;
		this.socket = io(config.url, {
			auth: { token: config.token },
			transports: ['websocket'],
		});

		this.setupEventHandlers();
	}

	/**
	 * Setup Socket.io event handlers
	 */
	private setupEventHandlers(): void {
		this.socket.on('connect', () => {
			console.log('[SFUClient] Connected to SFU server');
			this.joinRoom();
		});

		this.socket.on('disconnect', () => {
			console.log('[SFUClient] Disconnected from SFU server');
		});

		// New producer (someone joined/started sharing)
		this.socket.on('new-producer', async (data: ProducerInfo) => {
			console.log('[SFUClient] New producer:', data);
			await this.consumeProducer(data);
		});

		// Producer closed (someone left/stopped sharing)
		this.socket.on('producer-closed', (producerId: string) => {
			console.log('[SFUClient] Producer closed:', producerId);
			this.closeConsumer(producerId);
		});

		// Producer paused/resumed (mute/unmute)
		this.socket.on('producer-paused', (producerId: string) => {
			console.log('[SFUClient] Producer paused:', producerId);
		});

		this.socket.on('producer-resumed', (producerId: string) => {
			console.log('[SFUClient] Producer resumed:', producerId);
		});
	}

	/**
	 * Join SFU room
	 */
	private async joinRoom(): Promise<void> {
		this.socket.emit('join-room', {
			roomId: this.roomId,
		});
	}

	/**
	 * Create transport for sending/receiving
	 */
	async createTransport(direction: 'send' | 'recv'): Promise<TransportInfo> {
		return new Promise((resolve, reject) => {
			this.socket.emit('create-transport', {
				roomId: this.roomId,
				direction,
			}, (response: { error?: string; transport?: TransportInfo }) => {
				if (response.error) {
					reject(new Error(response.error));
				} else if (response.transport) {
					resolve(response.transport);
				} else {
					reject(new Error('No transport data received'));
				}
			});
		});
	}

	/**
	 * Connect transport
	 */
	async connectTransport(
		transportId: string,
		dtlsParameters: RTCDtlsParameters
	): Promise<void> {
		return new Promise((resolve, reject) => {
			this.socket.emit('connect-transport', {
				transportId,
				dtlsParameters,
			}, (response: { error?: string }) => {
				if (response.error) {
					reject(new Error(response.error));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Produce (send) media stream
	 */
	async produce(
		track: MediaStreamTrack,
		kind: 'audio' | 'video',
		peerConnection: RTCPeerConnection
	): Promise<string> {
		// Add track to peer connection
		const sender = peerConnection.addTrack(track);

		// Create offer and get transport parameters
		const transport = await this.createTransport('send');
		const offer = await peerConnection.createOffer();
		await peerConnection.setLocalDescription(offer);

		// Connect transport
		const dtlsParameters = await this.getDtlsParameters(peerConnection);
		await this.connectTransport(transport.id, dtlsParameters);

		// Notify server about producer
		return new Promise((resolve, reject) => {
			this.socket.emit('produce', {
				transportId: transport.id,
				kind,
				rtpParameters: await this.getRtpParameters(sender),
			}, (response: { error?: string; producerId?: string }) => {
				if (response.error) {
					reject(new Error(response.error));
				} else if (response.producerId) {
					this.producers.set(response.producerId, sender);
					resolve(response.producerId);
				} else {
					reject(new Error('No producer ID received'));
				}
			});
		});
	}

	/**
	 * Consume (receive) producer stream
	 */
	async consumeProducer(producerInfo: ProducerInfo): Promise<MediaStreamTrack | null> {
		try {
			// Request consumer from server
			const consumerParams = await new Promise<any>((resolve, reject) => {
				this.socket.emit('consume', {
					producerId: producerInfo.id,
				}, (response: { error?: string; consumerParams?: any }) => {
					if (response.error) {
						reject(new Error(response.error));
					} else {
						resolve(response.consumerParams);
					}
				});
			});

			// This would typically create a consumer on the SFU
			// and return parameters to create RTCRtpReceiver
			// Implementation depends on SFU type (mediasoup, LiveKit, etc.)

			console.log('[SFUClient] Consumer created for producer:', producerInfo.id);
			return null; // Return track when implemented
		} catch (error) {
			console.error('[SFUClient] Error consuming producer:', error);
			return null;
		}
	}

	/**
	 * Close consumer
	 */
	private closeConsumer(producerId: string): void {
		// Find consumer for this producer
		// Close and remove
		this.socket.emit('close-consumer', { producerId });
	}

	/**
	 * Pause producer (mute/unmute, camera off)
	 */
	async pauseProducer(producerId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this.socket.emit('pause-producer', { producerId }, (response: { error?: string }) => {
				if (response.error) {
					reject(new Error(response.error));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Resume producer
	 */
	async resumeProducer(producerId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this.socket.emit('resume-producer', { producerId }, (response: { error?: string }) => {
				if (response.error) {
					reject(new Error(response.error));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Get existing producers in room
	 */
	async getProducers(): Promise<ProducerInfo[]> {
		return new Promise((resolve, reject) => {
			this.socket.emit('get-producers', { roomId: this.roomId }, (response: { error?: string; producers?: ProducerInfo[] }) => {
				if (response.error) {
					reject(new Error(response.error));
				} else {
					resolve(response.producers || []);
				}
			});
		});
	}

	/**
	 * Leave room
	 */
	async leaveRoom(): Promise<void> {
		// Close all producers
		for (const [producerId] of this.producers) {
			await this.closeProducer(producerId);
		}

		// Close all consumers
		for (const [producerId] of this.consumers) {
			this.closeConsumer(producerId);
		}

		this.socket.emit('leave-room', { roomId: this.roomId });
		this.socket.disconnect();
	}

	/**
	 * Close producer
	 */
	private async closeProducer(producerId: string): Promise<void> {
		this.socket.emit('close-producer', { producerId });
		this.producers.delete(producerId);
	}

	/**
	 * Helper: Get DTLS parameters from peer connection
	 */
	private async getDtlsParameters(peerConnection: RTCPeerConnection): Promise<RTCDtlsParameters> {
		// Extract DTLS parameters from SDP
		// This is simplified - actual implementation depends on SFU
		const sdp = peerConnection.localDescription?.sdp || '';
		// Parse SDP to get DTLS parameters
		// For now, return empty object (would need proper SDP parsing)
		return {} as RTCDtlsParameters;
	}

	/**
	 * Helper: Get RTP parameters from sender
	 */
	private async getRtpParameters(sender: RTCRtpSender): Promise<any> {
		// Get RTP parameters from RTCRtpSender
		// Implementation depends on SFU
		return {};
	}

	/**
	 * Get socket instance (for custom events)
	 */
	getSocket(): Socket {
		return this.socket;
	}

	/**
	 * Check if connected
	 */
	isConnected(): boolean {
		return this.socket.connected;
	}
}

