/**
 * Media Handler
 * 
 * Manages local media streams, track replacement, and screen sharing
 */

export interface MediaConstraints {
	video?: boolean | MediaTrackConstraints;
	audio?: boolean | MediaTrackConstraints;
}

export class MediaHandler {
	private localStream: MediaStream | null = null;
	private screenStream: MediaStream | null = null;
	private videoTrack: MediaStreamTrack | null = null;
	private audioTrack: MediaStreamTrack | null = null;
	private screenVideoTrack: MediaStreamTrack | null = null;

	/**
	 * Get user media stream
	 */
	async getUserMedia(constraints: MediaConstraints): Promise<MediaStream> {
		try {
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			this.updateLocalStream(stream);
			return stream;
		} catch (error) {
			console.error('[MediaHandler] Error getting user media:', error);
			throw error;
		}
	}

	/**
	 * Get display media (screen share)
	 */
	async getDisplayMedia(options?: DisplayMediaStreamConstraints): Promise<MediaStream> {
		try {
			const constraints: DisplayMediaStreamConstraints = {
				video: {
					displaySurface: 'monitor',
					width: { ideal: 1920 },
					height: { ideal: 1080 },
					...options?.video as MediaTrackConstraints,
				},
				audio: options?.audio ?? true,
			};

			const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
			this.screenStream = stream;
			
			const videoTrack = stream.getVideoTracks()[0];
			if (videoTrack) {
				this.screenVideoTrack = videoTrack;
				
				// Handle screen share stop (user clicks stop sharing in browser)
				videoTrack.onended = () => {
					this.stopScreenShare();
				};
			}

			return stream;
		} catch (error) {
			console.error('[MediaHandler] Error getting display media:', error);
			throw error;
		}
	}

	/**
	 * Update local stream and track references
	 */
	private updateLocalStream(stream: MediaStream): void {
		this.localStream = stream;

		const videoTracks = stream.getVideoTracks();
		const audioTracks = stream.getAudioTracks();

		this.videoTrack = videoTracks[0] || null;
		this.audioTrack = audioTracks[0] || null;
	}

	/**
	 * Get local stream
	 */
	getLocalStream(): MediaStream | null {
		return this.localStream;
	}

	/**
	 * Get screen stream
	 */
	getScreenStream(): MediaStream | null {
		return this.screenStream;
	}

	/**
	 * Get video track (camera or screen)
	 */
	getVideoTrack(): MediaStreamTrack | null {
		return this.screenVideoTrack || this.videoTrack;
	}

	/**
	 * Get audio track
	 */
	getAudioTrack(): MediaStreamTrack | null {
		return this.audioTrack;
	}

	/**
	 * Check if currently screen sharing
	 */
	isScreenSharing(): boolean {
		return this.screenStream !== null && this.screenVideoTrack !== null;
	}

	/**
	 * Start screen sharing
	 * Replaces camera video track with screen share track
	 */
	async startScreenShare(
		replaceTrackCallback: (track: MediaStreamTrack) => Promise<void>
	): Promise<void> {
		if (this.isScreenSharing()) {
			console.warn('[MediaHandler] Already screen sharing');
			return;
		}

		try {
			const screenStream = await this.getDisplayMedia();
			const screenVideoTrack = screenStream.getVideoTracks()[0];

			if (!screenVideoTrack) {
				throw new Error('No video track in screen stream');
			}

			// Replace camera track with screen share track
			if (replaceTrackCallback) {
				await replaceTrackCallback(screenVideoTrack);
			}

			console.log('[MediaHandler] Screen sharing started');
		} catch (error) {
			console.error('[MediaHandler] Error starting screen share:', error);
			throw error;
		}
	}

	/**
	 * Stop screen sharing
	 * Restores camera video track
	 */
	async stopScreenShare(
		replaceTrackCallback?: (track: MediaStreamTrack | null) => Promise<void>
	): Promise<void> {
		if (!this.isScreenSharing()) {
			return;
		}

		try {
			// Stop screen share track
			if (this.screenVideoTrack) {
				this.screenVideoTrack.stop();
				this.screenVideoTrack = null;
			}

			if (this.screenStream) {
				this.screenStream.getTracks().forEach(track => track.stop());
				this.screenStream = null;
			}

			// Restore camera track if available
			if (this.videoTrack && replaceTrackCallback) {
				// Re-enable camera track if it was disabled
				if (!this.videoTrack.enabled) {
					// Need to get new stream if track was stopped
					try {
						const stream = await this.getUserMedia({
							video: true,
							audio: false, // Keep existing audio
						});
						const newVideoTrack = stream.getVideoTracks()[0];
						if (newVideoTrack) {
							this.videoTrack = newVideoTrack;
							await replaceTrackCallback(newVideoTrack);
						}
					} catch (error) {
						console.error('[MediaHandler] Error restoring camera:', error);
					}
				} else {
					await replaceTrackCallback(this.videoTrack);
				}
			}

			console.log('[MediaHandler] Screen sharing stopped');
		} catch (error) {
			console.error('[MediaHandler] Error stopping screen share:', error);
			throw error;
		}
	}

	/**
	 * Toggle video track (enable/disable)
	 */
	toggleVideo(enabled: boolean): void {
		if (this.videoTrack) {
			this.videoTrack.enabled = enabled;
		}
		if (this.screenVideoTrack) {
			// Don't disable screen share track, stop sharing instead
			console.warn('[MediaHandler] Cannot disable screen share track directly, stop sharing instead');
		}
	}

	/**
	 * Toggle audio track (mute/unmute)
	 */
	toggleAudio(enabled: boolean): void {
		if (this.audioTrack) {
			this.audioTrack.enabled = enabled;
		}
	}

	/**
	 * Check if video is enabled
	 */
	isVideoEnabled(): boolean {
		return this.videoTrack?.enabled ?? false;
	}

	/**
	 * Check if audio is enabled
	 */
	isAudioEnabled(): boolean {
		return this.audioTrack?.enabled ?? false;
	}

	/**
	 * Replace video track (used for renegotiation)
	 */
	async replaceVideoTrack(
		oldTrack: MediaStreamTrack | null,
		newTrack: MediaStreamTrack,
		replaceTrackCallback: (track: MediaStreamTrack) => Promise<void>
	): Promise<void> {
		try {
			// Stop old track
			if (oldTrack && oldTrack !== newTrack) {
				oldTrack.stop();
				if (this.localStream && this.localStream.getTracks().includes(oldTrack)) {
					this.localStream.removeTrack(oldTrack);
				}
			}

			// Add new track to stream
			if (this.localStream) {
				this.localStream.addTrack(newTrack);
			}

			// Replace in peer connection
			await replaceTrackCallback(newTrack);

			// Update reference
			if (newTrack.kind === 'video') {
				this.videoTrack = newTrack;
			}
		} catch (error) {
			console.error('[MediaHandler] Error replacing video track:', error);
			throw error;
		}
	}

	/**
	 * Stop all tracks and cleanup
	 */
	stopAllTracks(): void {
		if (this.localStream) {
			this.localStream.getTracks().forEach(track => track.stop());
			this.localStream = null;
		}

		if (this.screenStream) {
			this.screenStream.getTracks().forEach(track => track.stop());
			this.screenStream = null;
		}

		this.videoTrack = null;
		this.audioTrack = null;
		this.screenVideoTrack = null;
	}

	/**
	 * Get available devices
	 */
	async getDevices(): Promise<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[] }> {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			
			return {
				cameras: devices.filter(device => device.kind === 'videoinput'),
				microphones: devices.filter(device => device.kind === 'audioinput'),
			};
		} catch (error) {
			console.error('[MediaHandler] Error enumerating devices:', error);
			return { cameras: [], microphones: [] };
		}
	}
}

