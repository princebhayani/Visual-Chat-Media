/**
 * Peer Connection Manager
 * 
 * Handles WebRTC peer connection lifecycle, retry logic, and state management.
 */

import { getWebRTCConfig } from './config';

export type ConnectionState = 
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'reconnecting'
	| 'failed'
	| 'closed';

export interface PeerConnectionOptions {
	socketId: string;
	userId: string;
	isInitiator: boolean;
	onConnectionStateChange?: (state: ConnectionState) => void;
	onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
	onIceCandidate?: (candidate: RTCIceCandidate) => void;
	onTrack?: (event: RTCTrackEvent) => void;
	onSignalingStateChange?: (state: RTCSignalingState) => void;
}

export interface RetryConfig {
	maxRetries: number;
	initialDelay: number;
	maxDelay: number;
	backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 5,
	initialDelay: 1000, // 1 second
	maxDelay: 16000,    // 16 seconds
	backoffMultiplier: 2,
};

export class PeerConnectionManager {
	private peerConnection: RTCPeerConnection | null = null;
	private options: PeerConnectionOptions;
	private retryConfig: RetryConfig;
	private retryCount = 0;
	private retryTimeout: NodeJS.Timeout | null = null;
	private connectionState: ConnectionState = 'disconnected';
	private iceConnectionState: RTCIceConnectionState = 'new';
	private signalingState: RTCSignalingState = 'stable';
	private forceIceRestart = false;

	constructor(
		options: PeerConnectionOptions,
		retryConfig: Partial<RetryConfig> = {}
	) {
		this.options = options;
		this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
	}

	/**
	 * Create or get peer connection
	 */
	async createPeerConnection(forceRecreate = false): Promise<RTCPeerConnection> {
		// Close existing connection if recreating
		if (forceRecreate && this.peerConnection) {
			this.close();
		}

		// Return existing if not forcing recreation
		if (this.peerConnection && !forceRecreate) {
			return this.peerConnection;
		}

		// Create new peer connection
		const config = await getWebRTCConfig({
			iceTransportPolicy: 'all',
		});

		this.peerConnection = new RTCPeerConnection(config);
		this.setupEventHandlers();

		this.setConnectionState('connecting');
		return this.peerConnection;
	}

	/**
	 * Setup event handlers for connection state monitoring
	 */
	private setupEventHandlers(): void {
		if (!this.peerConnection) return;

		// Connection state changes
		this.peerConnection.onconnectionstatechange = () => {
			if (!this.peerConnection) return;

			const state = this.peerConnection.connectionState;
			console.log(`[PeerConnection] Connection state: ${state} (${this.options.socketId})`);

			switch (state) {
				case 'connected':
					this.setConnectionState('connected');
					this.resetRetry();
					break;
				case 'disconnected':
					this.setConnectionState('disconnected');
					break;
				case 'connecting':
					this.setConnectionState('connecting');
					break;
				case 'failed':
					this.handleConnectionFailure();
					break;
				case 'closed':
					this.setConnectionState('closed');
					break;
			}
		};

		// ICE connection state changes
		this.peerConnection.oniceconnectionstatechange = () => {
			if (!this.peerConnection) return;

			const state = this.peerConnection.iceConnectionState;
			this.iceConnectionState = state;
			console.log(`[PeerConnection] ICE connection state: ${state} (${this.options.socketId})`);

			this.options.onIceConnectionStateChange?.(state);

			switch (state) {
				case 'connected':
				case 'completed':
					this.setConnectionState('connected');
					this.resetRetry();
					break;
				case 'disconnected':
					// Temporary disconnection, wait for reconnection
					break;
				case 'failed':
					this.handleIceFailure();
					break;
				case 'closed':
					this.setConnectionState('closed');
					break;
			}
		};

		// ICE candidate gathering
		this.peerConnection.onicecandidate = (event) => {
			if (event.candidate) {
				console.log(`[PeerConnection] ICE candidate: ${event.candidate.type} (${this.options.socketId})`);
				this.options.onIceCandidate?.(event.candidate);
			} else {
				console.log(`[PeerConnection] ICE gathering complete (${this.options.socketId})`);
			}
		};

		// Remote track received
		this.peerConnection.ontrack = (event) => {
			console.log(`[PeerConnection] Remote track received: ${event.track.kind} (${this.options.socketId})`);
			this.options.onTrack?.(event);
		};

		// Signaling state changes
		this.peerConnection.onsignalingstatechange = () => {
			if (!this.peerConnection) return;

			const state = this.peerConnection.signalingState;
			this.signalingState = state;
			console.log(`[PeerConnection] Signaling state: ${state} (${this.options.socketId})`);
			this.options.onSignalingStateChange?.(state);
		};

		// ICE gathering state changes
		this.peerConnection.onicegatheringstatechange = () => {
			if (!this.peerConnection) return;
			console.log(`[PeerConnection] ICE gathering state: ${this.peerConnection.iceGatheringState} (${this.options.socketId})`);
		};
	}

	/**
	 * Handle connection failure with retry logic
	 */
	private async handleConnectionFailure(): Promise<void> {
		console.warn(`[PeerConnection] Connection failed (${this.options.socketId}), attempt ${this.retryCount + 1}/${this.retryConfig.maxRetries}`);

		if (this.retryCount >= this.retryConfig.maxRetries) {
			this.setConnectionState('failed');
			console.error(`[PeerConnection] Max retries reached, connection failed (${this.options.socketId})`);
			return;
		}

		this.setConnectionState('reconnecting');
		await this.scheduleRetry();
	}

	/**
	 * Handle ICE connection failure
	 */
	private async handleIceFailure(): Promise<void> {
		console.warn(`[PeerConnection] ICE connection failed (${this.options.socketId})`);

		// Try ICE restart first (less disruptive)
		if (this.signalingState === 'stable' && this.peerConnection) {
			try {
				await this.restartIce();
				return;
			} catch (error) {
				console.error('[PeerConnection] ICE restart failed:', error);
			}
		}

		// If ICE restart fails, recreate connection
		await this.handleConnectionFailure();
	}

	/**
	 * Restart ICE (create new offer with iceRestart)
	 */
	async restartIce(): Promise<RTCSessionDescriptionInit | null> {
		if (!this.peerConnection || this.signalingState !== 'stable') {
			console.warn('[PeerConnection] Cannot restart ICE: not in stable state');
			return null;
		}

		try {
			const offer = await this.peerConnection.createOffer({ iceRestart: true });
			await this.peerConnection.setLocalDescription(offer);
			this.forceIceRestart = true;
			console.log('[PeerConnection] ICE restart initiated');
			return offer;
		} catch (error) {
			console.error('[PeerConnection] Error restarting ICE:', error);
			throw error;
		}
	}

	/**
	 * Schedule retry with exponential backoff
	 */
	private async scheduleRetry(): Promise<void> {
		const delay = Math.min(
			this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, this.retryCount),
			this.retryConfig.maxDelay
		);

		console.log(`[PeerConnection] Scheduling retry in ${delay}ms (${this.options.socketId})`);

		this.retryTimeout = setTimeout(async () => {
			this.retryCount++;
			await this.recreateConnection();
		}, delay);
	}

	/**
	 * Recreate peer connection
	 */
	private async recreateConnection(): Promise<void> {
		console.log(`[PeerConnection] Recreating connection (${this.options.socketId})`);

		try {
			// Close old connection
			if (this.peerConnection) {
				this.peerConnection.close();
			}

			// Create new connection
			await this.createPeerConnection(true);
		} catch (error) {
			console.error('[PeerConnection] Error recreating connection:', error);
			await this.handleConnectionFailure();
		}
	}

	/**
	 * Reset retry counter
	 */
	private resetRetry(): void {
		if (this.retryCount > 0) {
			console.log(`[PeerConnection] Connection restored, resetting retry counter (${this.options.socketId})`);
		}
		this.retryCount = 0;
		if (this.retryTimeout) {
			clearTimeout(this.retryTimeout);
			this.retryTimeout = null;
		}
	}

	/**
	 * Set connection state and notify listeners
	 */
	private setConnectionState(state: ConnectionState): void {
		if (this.connectionState === state) return;

		this.connectionState = state;
		this.options.onConnectionStateChange?.(state);
	}

	/**
	 * Get current peer connection
	 */
	getPeerConnection(): RTCPeerConnection | null {
		return this.peerConnection;
	}

	/**
	 * Get current connection state
	 */
	getConnectionState(): ConnectionState {
		return this.connectionState;
	}

	/**
	 * Get ICE connection state
	 */
	getIceConnectionState(): RTCIceConnectionState {
		return this.iceConnectionState;
	}

	/**
	 * Get signaling state
	 */
	getSignalingState(): RTCSignalingState {
		return this.signalingState;
	}

	/**
	 * Add local track to peer connection
	 */
	async addTrack(track: MediaStreamTrack, stream: MediaStream): Promise<RTCRtpSender> {
		if (!this.peerConnection) {
			throw new Error('Peer connection not initialized');
		}

		return this.peerConnection.addTrack(track, stream);
	}

	/**
	 * Replace track on existing sender
	 */
	async replaceTrack(sender: RTCRtpSender, track: MediaStreamTrack | null): Promise<void> {
		if (!this.peerConnection) {
			throw new Error('Peer connection not initialized');
		}

		await sender.replaceTrack(track);
	}

	/**
	 * Get all senders
	 */
	getSenders(): RTCRtpSender[] {
		if (!this.peerConnection) {
			return [];
		}
		return this.peerConnection.getSenders();
	}

	/**
	 * Create offer
	 */
	async createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
		if (!this.peerConnection) {
			throw new Error('Peer connection not initialized');
		}

		const offerOptions: RTCOfferOptions = {
			iceRestart: this.forceIceRestart || options?.iceRestart,
			offerToReceiveAudio: true,
			offerToReceiveVideo: true,
			...options,
		};

		const offer = await this.peerConnection.createOffer(offerOptions);
		await this.peerConnection.setLocalDescription(offer);
		this.forceIceRestart = false;
		return offer;
	}

	/**
	 * Create answer
	 */
	async createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
		if (!this.peerConnection) {
			throw new Error('Peer connection not initialized');
		}

		const answer = await this.peerConnection.createAnswer(options);
		await this.peerConnection.setLocalDescription(answer);
		return answer;
	}

	/**
	 * Set remote description
	 */
	async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
		if (!this.peerConnection) {
			throw new Error('Peer connection not initialized');
		}

		await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
	}

	/**
	 * Add ICE candidate
	 */
	async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
		if (!this.peerConnection) {
			throw new Error('Peer connection not initialized');
		}

		await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
	}

	/**
	 * Wait for signaling state
	 */
	async waitForSignalingState(targetState: RTCSignalingState, timeout = 10000): Promise<void> {
		if (!this.peerConnection) {
			throw new Error('Peer connection not initialized');
		}

		if (this.peerConnection.signalingState === targetState) {
			return;
		}

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error(`Timeout waiting for signaling state: ${targetState}`));
			}, timeout);

			const handler = () => {
				if (!this.peerConnection) {
					clearTimeout(timeoutId);
					reject(new Error('Peer connection closed'));
					return;
				}

				if (this.peerConnection.signalingState === targetState) {
					this.peerConnection.removeEventListener('signalingstatechange', handler);
					clearTimeout(timeoutId);
					resolve();
				}
			};

			this.peerConnection.addEventListener('signalingstatechange', handler);
		});
	}

	/**
	 * Close peer connection and cleanup
	 */
	close(): void {
		if (this.retryTimeout) {
			clearTimeout(this.retryTimeout);
			this.retryTimeout = null;
		}

		if (this.peerConnection) {
			this.peerConnection.close();
			this.peerConnection = null;
		}

		this.setConnectionState('closed');
		this.retryCount = 0;
	}
}

