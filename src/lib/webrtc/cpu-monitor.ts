/**
 * CPU Monitor & Throttling
 * 
 * Monitors CPU usage and adjusts quality to prevent lag
 */

import { getConnectionQuality, ConnectionQuality } from './utils';

export interface CPUMonitorOptions {
	checkInterval?: number; // ms
	highCPUThreshold?: number; // percentage (0-100)
	mediumCPUThreshold?: number;
	adjustmentDelay?: number; // ms before adjusting after high CPU
}

export type CPULevel = 'low' | 'medium' | 'high' | 'critical';

export interface CPUStats {
	level: CPULevel;
	estimatedUsage: number; // 0-100
	frameDrops: number;
	encodingDelay: number; // ms
}

export class CPUMonitor {
	private peerConnection: RTCPeerConnection;
	private options: Required<CPUMonitorOptions>;
	private monitoringInterval: NodeJS.Timeout | null = null;
	private statsHistory: CPUStats[] = [];
	private callbacks: Array<(stats: CPUStats) => void> = [];
	private highCPUStartTime: number | null = null;

	constructor(
		peerConnection: RTCPeerConnection,
		options: CPUMonitorOptions = {}
	) {
		this.peerConnection = peerConnection;
		this.options = {
			checkInterval: options.checkInterval || 2000, // 2 seconds
			highCPUThreshold: options.highCPUThreshold || 80,
			mediumCPUThreshold: options.mediumCPUThreshold || 60,
			adjustmentDelay: options.adjustmentDelay || 5000, // 5 seconds
		};
	}

	/**
	 * Start CPU monitoring
	 */
	start(): void {
		if (this.monitoringInterval) return;

		this.monitoringInterval = setInterval(async () => {
			const stats = await this.checkCPUUsage();
			if (stats) {
				this.statsHistory.push(stats);
				
				// Keep only last 10 samples
				if (this.statsHistory.length > 10) {
					this.statsHistory.shift();
				}

				// Notify callbacks
				this.callbacks.forEach(callback => {
					try {
						callback(stats);
					} catch (error) {
						console.error('[CPUMonitor] Callback error:', error);
					}
				});
			}
		}, this.options.checkInterval);
	}

	/**
	 * Stop monitoring
	 */
	stop(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}
	}

	/**
	 * Check CPU usage from WebRTC stats
	 */
	private async checkCPUUsage(): Promise<CPUStats | null> {
		try {
			const stats = await this.peerConnection.getStats();
			const connectionQuality = await getConnectionQuality(this.peerConnection);

			// Estimate CPU usage from various metrics
			let frameDrops = 0;
			let encodingDelay = 0;
			let framesEncoded = 0;
			let framesSent = 0;

			for (const [_, stat] of Array.from(stats)) {
				if (stat.type === 'media-source') {
					const source = stat as RTCAudioSourceStats | RTCVideoSourceStats;
					
					if ('framesPerSecond' in source) {
						// Video source
						const videoSource = source as RTCVideoSourceStats;
						framesEncoded = videoSource.frames || 0;
					}
				}

				if (stat.type === 'outbound-rtp') {
					const rtp = stat as RTCOutboundRtpStreamStats;
					framesSent = rtp.framesSent || 0;
					
					if (rtp.framesDropped !== undefined) {
						frameDrops += rtp.framesDropped;
					}
				}

				if (stat.type === 'track') {
					const track = stat as RTCOutboundRtpStreamStats;
					if (track.jitterBufferDelay !== undefined) {
						encodingDelay = track.jitterBufferDelay * 1000; // Convert to ms
					}
				}
			}

			// Estimate CPU usage from frame drops and encoding delay
			// Higher frame drops = higher CPU usage
			// Higher encoding delay = higher CPU usage
			const dropRate = framesEncoded > 0 ? (frameDrops / framesEncoded) * 100 : 0;
			const delayFactor = Math.min(encodingDelay / 100, 1); // Normalize to 0-1
			const dropFactor = Math.min(dropRate / 10, 1); // Normalize to 0-1

			// Combine factors to estimate CPU usage (0-100)
			const estimatedUsage = Math.min(
				100,
				(delayFactor * 40) + (dropFactor * 40) + (connectionQuality ? connectionQuality.packetLoss * 2 : 0)
			);

			// Determine CPU level
			let level: CPULevel = 'low';
			if (estimatedUsage >= this.options.highCPUThreshold) {
				level = 'critical';
			} else if (estimatedUsage >= this.options.mediumCPUThreshold) {
				level = 'high';
			} else if (estimatedUsage >= 40) {
				level = 'medium';
			}

			// Track high CPU duration
			if (level === 'high' || level === 'critical') {
				if (!this.highCPUStartTime) {
					this.highCPUStartTime = Date.now();
				}
			} else {
				this.highCPUStartTime = null;
			}

			return {
				level,
				estimatedUsage,
				frameDrops,
				encodingDelay,
			};
		} catch (error) {
			console.error('[CPUMonitor] Error checking CPU usage:', error);
			return null;
		}
	}

	/**
	 * Subscribe to CPU updates
	 */
	onUpdate(callback: (stats: CPUStats) => void): () => void {
		this.callbacks.push(callback);

		// Return unsubscribe function
		return () => {
			const index = this.callbacks.indexOf(callback);
			if (index > -1) {
				this.callbacks.splice(index, 1);
			}
		};
	}

	/**
	 * Get current CPU stats
	 */
	async getCurrentStats(): Promise<CPUStats | null> {
		return this.checkCPUUsage();
	}

	/**
	 * Get average CPU level over recent samples
	 */
	getAverageLevel(): CPULevel {
		if (this.statsHistory.length === 0) return 'low';

		const levels = this.statsHistory.map(s => s.level);
		const levelValues = { low: 0, medium: 1, high: 2, critical: 3 };

		// Find most common level
		const counts = { low: 0, medium: 0, high: 0, critical: 0 };
		levels.forEach(level => counts[level]++);

		const maxCount = Math.max(...Object.values(counts));
		const avgLevel = Object.entries(counts).find(([_, count]) => count === maxCount)?.[0] as CPULevel;

		return avgLevel || 'low';
	}

	/**
	 * Check if CPU has been high for extended period
	 */
	shouldThrottle(): boolean {
		if (!this.highCPUStartTime) return false;
		
		const duration = Date.now() - this.highCPUStartTime;
		return duration >= this.options.adjustmentDelay;
	}
}

