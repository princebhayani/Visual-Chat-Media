/**
 * Network Quality Monitor
 * 
 * Monitors network conditions and provides quality assessment
 */

import { getConnectionQuality, ConnectionQuality } from './utils';

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface NetworkMetrics {
	quality: NetworkQuality;
	packetLoss: number;
	rtt: number;
	jitter: number;
	bitrate?: number;
	framerate?: number;
	timestamp: number;
}

export interface NetworkMonitorOptions {
	monitoringInterval?: number; // ms
	packetLossThreshold?: number; // percentage
	rttThreshold?: number; // ms
	jitterThreshold?: number; // ms
	historySize?: number; // number of samples to keep
}

export type NetworkQualityCallback = (metrics: NetworkMetrics) => void;

export class NetworkMonitor {
	private peerConnection: RTCPeerConnection;
	private monitoringInterval: NodeJS.Timeout | null = null;
	private isMonitoring = false;
	private options: Required<NetworkMonitorOptions>;
	private callbacks: NetworkQualityCallback[] = [];
	private history: NetworkMetrics[] = [];

	constructor(
		peerConnection: RTCPeerConnection,
		options: NetworkMonitorOptions = {}
	) {
		this.peerConnection = peerConnection;
		this.options = {
			monitoringInterval: options.monitoringInterval || 2000, // 2 seconds
			packetLossThreshold: options.packetLossThreshold || 5, // 5%
			rttThreshold: options.rttThreshold || 300, // 300ms
			jitterThreshold: options.jitterThreshold || 50, // 50ms
			historySize: options.historySize || 10, // Keep last 10 samples
		};
	}

	/**
	 * Start monitoring network quality
	 */
	start(): void {
		if (this.isMonitoring) {
			return;
		}

		this.isMonitoring = true;
		this.monitoringInterval = setInterval(async () => {
			await this.checkNetworkQuality();
		}, this.options.monitoringInterval);

		console.log('[NetworkMonitor] Started monitoring');
	}

	/**
	 * Stop monitoring
	 */
	stop(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}
		this.isMonitoring = false;
		console.log('[NetworkMonitor] Stopped monitoring');
	}

	/**
	 * Check current network quality
	 */
	private async checkNetworkQuality(): Promise<void> {
		try {
			const stats = await getConnectionQuality(this.peerConnection);
			if (!stats) {
				return;
			}

			const quality = this.assessQuality(stats);
			const metrics: NetworkMetrics = {
				quality,
				packetLoss: stats.packetLoss,
				rtt: stats.rtt,
				jitter: stats.jitter,
				bitrate: stats.bitrate,
				framerate: stats.framerate,
				timestamp: Date.now(),
			};

			// Add to history
			this.history.push(metrics);
			if (this.history.length > this.options.historySize) {
				this.history.shift();
			}

			// Notify callbacks
			this.callbacks.forEach((callback) => {
				try {
					callback(metrics);
				} catch (error) {
					console.error('[NetworkMonitor] Callback error:', error);
				}
			});
		} catch (error) {
			console.error('[NetworkMonitor] Error checking quality:', error);
		}
	}

	/**
	 * Assess network quality from connection stats
	 */
	private assessQuality(stats: ConnectionQuality): NetworkQuality {
		const { packetLoss, rtt, jitter } = stats;

		// Poor: High packet loss OR high RTT OR high jitter
		if (
			packetLoss > this.options.packetLossThreshold ||
			rtt > this.options.rttThreshold ||
			jitter > this.options.jitterThreshold
		) {
			return 'poor';
		}

		// Fair: Moderate issues
		if (
			packetLoss > 2 ||
			rtt > 200 ||
			jitter > 30
		) {
			return 'fair';
		}

		// Good: Minor issues
		if (
			packetLoss > 0.5 ||
			rtt > 100 ||
			jitter > 15
		) {
			return 'good';
		}

		// Excellent: All metrics good
		return 'excellent';
	}

	/**
	 * Subscribe to network quality updates
	 */
	onQualityChange(callback: NetworkQualityCallback): () => void {
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
	 * Get current network metrics
	 */
	async getCurrentMetrics(): Promise<NetworkMetrics | null> {
		try {
			const stats = await getConnectionQuality(this.peerConnection);
			if (!stats) {
				return null;
			}

			const quality = this.assessQuality(stats);
			return {
				quality,
				packetLoss: stats.packetLoss,
				rtt: stats.rtt,
				jitter: stats.jitter,
				bitrate: stats.bitrate,
				framerate: stats.framerate,
				timestamp: Date.now(),
			};
		} catch (error) {
			console.error('[NetworkMonitor] Error getting metrics:', error);
			return null;
		}
	}

	/**
	 * Get quality history
	 */
	getHistory(): NetworkMetrics[] {
		return [...this.history];
	}

	/**
	 * Get average quality over history
	 */
	getAverageQuality(): NetworkQuality {
		if (this.history.length === 0) {
			return 'good'; // Default
		}

		// Count quality occurrences
		const counts = {
			excellent: 0,
			good: 0,
			fair: 0,
			poor: 0,
		};

		this.history.forEach((metrics) => {
			counts[metrics.quality]++;
		});

		// Return most common quality
		const maxCount = Math.max(...Object.values(counts));
		const quality = Object.entries(counts).find(([_, count]) => count === maxCount)?.[0] as NetworkQuality;

		return quality || 'good';
	}

	/**
	 * Check if network is stable (quality hasn't changed much)
	 */
	isStable(): boolean {
		if (this.history.length < 3) {
			return false;
		}

		const recent = this.history.slice(-3);
		const qualities = recent.map((m) => m.quality);
		
		// All recent samples have same quality
		return qualities.every((q) => q === qualities[0]);
	}

	/**
	 * Get quality trend (improving, degrading, stable)
	 */
	getTrend(): 'improving' | 'degrading' | 'stable' {
		if (this.history.length < 3) {
			return 'stable';
		}

		const qualityValues = {
			poor: 0,
			fair: 1,
			good: 2,
			excellent: 3,
		};

		const recent = this.history.slice(-3);
		const values = recent.map((m) => qualityValues[m.quality]);

		// Check if values are increasing (improving) or decreasing (degrading)
		const first = values[0];
		const last = values[values.length - 1];

		if (last > first) {
			return 'improving';
		} else if (last < first) {
			return 'degrading';
		}

		return 'stable';
	}
}

