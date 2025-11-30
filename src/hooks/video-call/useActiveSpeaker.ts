/**
 * Active Speaker Detection Hook
 * 
 * Detects which participant is currently speaking by analyzing audio levels
 */

import { useEffect, useState, useRef } from "react";

export interface UseActiveSpeakerOptions {
	threshold?: number; // Audio level threshold (0-1)
	debounceMs?: number; // Debounce time in milliseconds
	checkInterval?: number; // How often to check (ms)
}

export interface ActiveSpeakerInfo {
	socketId: string | null;
	audioLevel: number; // 0-1
}

export function useActiveSpeaker(
	peerConnections: Map<string, RTCPeerConnection>,
	options: UseActiveSpeakerOptions = {}
): ActiveSpeakerInfo {
	const { threshold = 0.01, debounceMs = 500, checkInterval = 100 } = options;
	const [activeSpeaker, setActiveSpeaker] = useState<ActiveSpeakerInfo>({
		socketId: null,
		audioLevel: 0,
	});
	const audioLevelsRef = useRef<Map<string, number>>(new Map());
	const lastUpdateRef = useRef<number>(0);
	const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(peerConnections);
	
	// Update ref on every render (but don't trigger effects)
	peerConnectionsRef.current = peerConnections;

	// Reset to no active speaker when no connections
	useEffect(() => {
		if (peerConnections.size === 0) {
			setActiveSpeaker((prev) => {
				if (prev.socketId !== null || prev.audioLevel !== 0) {
					return { socketId: null, audioLevel: 0 };
				}
				return prev;
			});
		}
	}, [peerConnections.size]);

	useEffect(() => {
		// Skip if no connections
		if (peerConnections.size === 0) {
			return;
		}

		const analyzeAudio = async () => {
			const levels = new Map<string, number>();

			// Analyze audio levels for each peer connection
			for (const [socketId, peerConnection] of Array.from(peerConnectionsRef.current)) {
				try {
					const stats = await peerConnection.getStats();
					
					for (const [_, stat] of Array.from(stats)) {
						if (stat.type === "media-source" || stat.type === "inbound-rtp") {
							const audioStat = stat as any;
							
							// Get audio level if available
							if ("audioLevel" in audioStat && audioStat.audioLevel !== undefined) {
								// Audio level is typically 0-32767, normalize to 0-1
								const normalizedLevel = audioStat.audioLevel / 32767;
								levels.set(socketId, normalizedLevel);
							} else if ("totalAudioEnergy" in audioStat) {
								// Fallback: use energy as proxy for level
								const energy = audioStat.totalAudioEnergy || 0;
								const normalizedLevel = Math.min(energy / 100000, 1);
								levels.set(socketId, normalizedLevel);
							}
						}
					}
				} catch (error) {
					console.error(`Error analyzing audio for ${socketId}:`, error);
				}
			}

			audioLevelsRef.current = levels;

			// Find highest audio level
			let maxLevel = 0;
			let activeSocketId: string | null = null;

			levels.forEach((level, socketId) => {
				if (level > maxLevel && level > threshold) {
					maxLevel = level;
					activeSocketId = socketId;
				}
			});

			// Update with debounce
			const now = Date.now();
			if (now - lastUpdateRef.current >= debounceMs) {
				setActiveSpeaker({
					socketId: activeSocketId,
					audioLevel: maxLevel,
				});
				lastUpdateRef.current = now;
			}
		};

		const interval = setInterval(analyzeAudio, checkInterval);
		
		// Initial check
		analyzeAudio();

		return () => clearInterval(interval);
	}, [peerConnections.size, threshold, debounceMs, checkInterval]); // Use size as dependency instead of Map reference

	return activeSpeaker;
}

