/**
 * Seamless Stream Switcher
 * 
 * Switches between camera and screen share without dropping call
 * Uses track replacement instead of full renegotiation
 */

import { MediaHandler } from './media-handler';

export interface StreamSwitchOptions {
	onSwitchStart?: () => void;
	onSwitchComplete?: () => void;
	onSwitchError?: (error: Error) => void;
}

export class SeamlessStreamSwitcher {
	private peerConnection: RTCPeerConnection;
	private mediaHandler: MediaHandler;
	private videoSender: RTCRtpSender | null = null;
	private audioSender: RTCRtpSender | null = null;
	private currentVideoTrack: MediaStreamTrack | null = null;

	constructor(peerConnection: RTCPeerConnection, mediaHandler: MediaHandler) {
		this.peerConnection = peerConnection;
		this.mediaHandler = mediaHandler;
		this.findSenders();
	}

	/**
	 * Find existing senders
	 */
	private findSenders(): void {
		const senders = this.peerConnection.getSenders();
		
		this.videoSender = senders.find(sender => 
			sender.track && sender.track.kind === 'video'
		) || null;

		this.audioSender = senders.find(sender => 
			sender.track && sender.track.kind === 'audio'
		) || null;

		if (this.videoSender?.track) {
			this.currentVideoTrack = this.videoSender.track;
		}
	}

	/**
	 * Switch to screen share
	 */
	async switchToScreenShare(
		options: StreamSwitchOptions = {}
	): Promise<MediaStreamTrack> {
		const { onSwitchStart, onSwitchComplete, onSwitchError } = options;

		try {
			onSwitchStart?.();

			// Get screen share stream
			const screenStream = await this.mediaHandler.getDisplayMedia({
				video: {
					displaySurface: 'monitor',
					width: { ideal: 1920 },
					height: { ideal: 1080 },
					frameRate: { ideal: 30 },
				} as MediaTrackConstraints,
				audio: true,
			});

			const screenVideoTrack = screenStream.getVideoTracks()[0];
			if (!screenVideoTrack) {
				throw new Error('No video track in screen stream');
			}

			// Replace video track on existing sender (NO renegotiation!)
			if (this.videoSender) {
				await this.videoSender.replaceTrack(screenVideoTrack);
				console.log('[StreamSwitcher] ✅ Replaced video track with screen share');
			} else {
				// If no sender exists, add track (will trigger renegotiation)
				if (this.mediaHandler.getLocalStream()) {
					this.videoSender = this.peerConnection.addTrack(
						screenVideoTrack,
						this.mediaHandler.getLocalStream()!
					);
					console.log('[StreamSwitcher] ⚠️ Added new video track (renegotiation triggered)');
				} else {
					throw new Error('No local stream available');
				}
			}

			// Handle screen share audio if available
			const screenAudioTrack = screenStream.getAudioTracks()[0];
			if (screenAudioTrack && this.audioSender) {
				// Optionally replace audio track with system audio
				// Note: This may cause brief audio interruption
				try {
					await this.audioSender.replaceTrack(screenAudioTrack);
					console.log('[StreamSwitcher] ✅ Replaced audio track with system audio');
				} catch (error) {
					console.warn('[StreamSwitcher] Could not replace audio track:', error);
				}
			}

			// Update current track reference
			this.currentVideoTrack = screenVideoTrack;

			// Handle track ended (user stops sharing in browser)
			screenVideoTrack.onended = () => {
				console.log('[StreamSwitcher] Screen share track ended, switching back to camera');
				this.switchToCamera().catch(error => {
					console.error('[StreamSwitcher] Error switching back to camera:', error);
				});
			};

			onSwitchComplete?.();
			return screenVideoTrack;
		} catch (error) {
			const err = error instanceof Error ? error : new Error('Unknown error');
			onSwitchError?.(err);
			throw err;
		}
	}

	/**
	 * Switch back to camera
	 */
	async switchToCamera(
		options: StreamSwitchOptions = {}
	): Promise<MediaStreamTrack> {
		const { onSwitchStart, onSwitchComplete, onSwitchError } = options;

		try {
			onSwitchStart?.();

			// Stop screen share track
			if (this.currentVideoTrack && this.currentVideoTrack.readyState === 'live') {
				this.currentVideoTrack.stop();
			}

			// Get camera stream
			const cameraStream = await this.mediaHandler.getUserMedia({
				video: true,
				audio: false, // Keep existing audio
			});

			const cameraVideoTrack = cameraStream.getVideoTracks()[0];
			if (!cameraVideoTrack) {
				throw new Error('No video track in camera stream');
			}

			// Replace video track (NO renegotiation!)
			if (this.videoSender) {
				await this.videoSender.replaceTrack(cameraVideoTrack);
				console.log('[StreamSwitcher] ✅ Replaced video track with camera');
			} else {
				throw new Error('No video sender available');
			}

			// Update current track reference
			this.currentVideoTrack = cameraVideoTrack;

			onSwitchComplete?.();
			return cameraVideoTrack;
		} catch (error) {
			const err = error instanceof Error ? error : new Error('Unknown error');
			onSwitchError?.(err);
			throw err;
		}
	}

	/**
	 * Get current video track
	 */
	getCurrentTrack(): MediaStreamTrack | null {
		return this.currentVideoTrack;
	}

	/**
	 * Check if currently sharing screen
	 */
	isScreenSharing(): boolean {
		return this.currentVideoTrack?.label.includes('screen') || false;
	}
}

