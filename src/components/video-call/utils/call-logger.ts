/**
 * Call Logger
 * 
 * Logs call information for analytics and debugging
 */

export interface CallLog {
	callId: string;
	startTime: number;
	endTime?: number;
	duration?: number; // in seconds
	participants: string[];
	callType: "audio" | "video";
	connectionQuality: {
		packetLoss: number;
		rtt: number;
		jitter: number;
	}[];
	endReason?: "ended" | "dropped" | "error" | "declined";
	error?: string;
}

class CallLogger {
	private logs: Map<string, CallLog> = new Map();
	private storageKey = "call-logs";
	private maxLogs = 100; // Keep last 100 logs

	/**
	 * Start logging a call
	 */
	startCall(log: Omit<CallLog, "endTime" | "duration">): void {
		this.logs.set(log.callId, {
			...log,
			startTime: Date.now(),
		});
		this.saveLogs();
	}

	/**
	 * End logging a call
	 */
	endCall(
		callId: string,
		reason: CallLog["endReason"] = "ended",
		error?: string
	): CallLog | null {
		const log = this.logs.get(callId);
		if (!log) {
			console.warn(`[CallLogger] No log found for call ${callId}`);
			return null;
		}

		const endTime = Date.now();
		const duration = Math.floor((endTime - log.startTime) / 1000);

		const updatedLog: CallLog = {
			...log,
			endTime,
			duration,
			endReason: reason,
			error,
		};

		this.logs.set(callId, updatedLog);
		this.saveLogs();

		return updatedLog;
	}

	/**
	 * Update connection quality metrics
	 */
	updateQuality(
		callId: string,
		quality: { packetLoss: number; rtt: number; jitter: number }
	): void {
		const log = this.logs.get(callId);
		if (!log) return;

		log.connectionQuality.push(quality);
		this.logs.set(callId, log);
		
		// Only save periodically to avoid excessive writes
		if (log.connectionQuality.length % 10 === 0) {
			this.saveLogs();
		}
	}

	/**
	 * Get all logs
	 */
	getLogs(): CallLog[] {
		this.loadLogs();
		return Array.from(this.logs.values())
			.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
	}

	/**
	 * Get log for a specific call
	 */
	getLog(callId: string): CallLog | null {
		this.loadLogs();
		return this.logs.get(callId) || null;
	}

	/**
	 * Clear all logs
	 */
	clearLogs(): void {
		this.logs.clear();
		localStorage.removeItem(this.storageKey);
	}

	/**
	 * Export logs as JSON
	 */
	exportLogs(): string {
		return JSON.stringify(this.getLogs(), null, 2);
	}

	/**
	 * Save logs to localStorage
	 */
	private saveLogs(): void {
		try {
			const logs = Array.from(this.logs.values());
			
			// Keep only recent logs
			const recentLogs = logs
				.sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
				.slice(0, this.maxLogs);

			localStorage.setItem(this.storageKey, JSON.stringify(recentLogs));
		} catch (error) {
			console.error("[CallLogger] Error saving logs:", error);
		}
	}

	/**
	 * Load logs from localStorage
	 */
	private loadLogs(): void {
		try {
			const stored = localStorage.getItem(this.storageKey);
			if (!stored) return;

			const logs: CallLog[] = JSON.parse(stored);
			logs.forEach((log) => {
				this.logs.set(log.callId, log);
			});
		} catch (error) {
			console.error("[CallLogger] Error loading logs:", error);
		}
	}

	/**
	 * Get statistics
	 */
	getStatistics(): {
		totalCalls: number;
		totalDuration: number;
		averageDuration: number;
		averageQuality: {
			packetLoss: number;
			rtt: number;
			jitter: number;
		};
	} {
		const logs = this.getLogs();
		const completedLogs = logs.filter((log) => log.endTime && log.duration);

		const totalCalls = completedLogs.length;
		const totalDuration = completedLogs.reduce(
			(sum, log) => sum + (log.duration || 0),
			0
		);
		const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

		// Calculate average quality metrics
		let totalPacketLoss = 0;
		let totalRtt = 0;
		let totalJitter = 0;
		let qualitySampleCount = 0;

		logs.forEach((log) => {
			log.connectionQuality.forEach((quality) => {
				totalPacketLoss += quality.packetLoss;
				totalRtt += quality.rtt;
				totalJitter += quality.jitter;
				qualitySampleCount++;
			});
		});

		const averageQuality = {
			packetLoss: qualitySampleCount > 0 ? totalPacketLoss / qualitySampleCount : 0,
			rtt: qualitySampleCount > 0 ? totalRtt / qualitySampleCount : 0,
			jitter: qualitySampleCount > 0 ? totalJitter / qualitySampleCount : 0,
		};

		return {
			totalCalls,
			totalDuration,
			averageDuration,
			averageQuality,
		};
	}
}

export const callLogger = new CallLogger();

