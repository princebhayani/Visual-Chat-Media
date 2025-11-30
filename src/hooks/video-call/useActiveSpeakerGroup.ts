/**
 * Active Speaker Detection for Group Calls
 * 
 * Detects active speaker from multiple participants
 * Uses audio level analysis from SFU
 */

import { useEffect, useState } from "react";
import { SFUClient } from "@/services/sfu-client";

export interface ActiveSpeakerInfo {
	userId: string | null;
	audioLevel: number; // 0-1
	producerId: string | null;
}

export interface UseActiveSpeakerGroupOptions {
	sfuClient: SFUClient;
	participants: Array<{
		userId: string;
		audioProducerId?: string;
	}>;
	threshold?: number; // Audio level threshold (0-1)
	debounceMs?: number; // Debounce time
	checkInterval?: number; // How often to check (ms)
}

export function useActiveSpeakerGroup(
	options: UseActiveSpeakerGroupOptions
): ActiveSpeakerInfo {
	const {
		sfuClient,
		participants,
		threshold = 0.01,
		debounceMs = 500,
		checkInterval = 200, // Check every 200ms for responsiveness
	} = options;

	const [activeSpeaker, setActiveSpeaker] = useState<ActiveSpeakerInfo>({
		userId: null,
		audioLevel: 0,
		producerId: null,
	});

	useEffect(() => {
		if (!sfuClient.isConnected() || participants.length === 0) {
			setActiveSpeaker({ userId: null, audioLevel: 0, producerId: null });
			return;
		}

		let lastUpdate = 0;
		const checkAudioLevels = async () => {
			try {
				// Request audio levels from SFU server
				// This would typically come from SFU stats or events
				const audioLevels = await getAudioLevelsFromSFU(sfuClient, participants);

				// Find highest audio level
				let maxLevel = 0;
				let activeUserId: string | null = null;
				let activeProducerId: string | null = null;

				audioLevels.forEach(({ userId, producerId, level }) => {
					if (level > maxLevel && level > threshold) {
						maxLevel = level;
						activeUserId = userId;
						activeProducerId = producerId;
					}
				});

				// Update with debounce
				const now = Date.now();
				if (now - lastUpdate >= debounceMs) {
					setActiveSpeaker({
						userId: activeUserId,
						audioLevel: maxLevel,
						producerId: activeProducerId,
					});
					lastUpdate = now;
				}
			} catch (error) {
				console.error('[useActiveSpeakerGroup] Error checking audio levels:', error);
			}
		};

		// Check periodically
		const interval = setInterval(checkAudioLevels, checkInterval);

		// Initial check
		checkAudioLevels();

		return () => clearInterval(interval);
	}, [sfuClient, participants, threshold, debounceMs, checkInterval]);

	return activeSpeaker;
}

/**
 * Get audio levels from SFU
 * This is a placeholder - actual implementation depends on SFU
 */
async function getAudioLevelsFromSFU(
	sfuClient: SFUClient,
	participants: Array<{ userId: string; audioProducerId?: string }>
): Promise<Array<{ userId: string; producerId: string; level: number }>> {
	// This would typically:
	// 1. Request stats from SFU server
	// 2. Parse audio levels from stats
	// 3. Return normalized levels (0-1)

	// Placeholder implementation
	return new Promise((resolve) => {
		sfuClient.getSocket().emit(
			'get-audio-levels',
			{
				producerIds: participants
					.filter(p => p.audioProducerId)
					.map(p => p.audioProducerId!),
			},
			(response: {
				error?: string;
				levels?: Array<{ producerId: string; level: number }>;
			}) => {
				if (response.levels) {
					const levels = response.levels.map(({ producerId, level }) => {
						const participant = participants.find(
							p => p.audioProducerId === producerId
						);
						return {
							userId: participant?.userId || '',
							producerId,
							level: level / 32767, // Normalize to 0-1
						};
					});
					resolve(levels);
				} else {
					resolve([]);
				}
			}
		);
	});
}

