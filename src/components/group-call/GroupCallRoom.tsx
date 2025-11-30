/**
 * Group Call Room Component
 * 
 * Main container for group video calls
 * Handles SFU integration, participant management, and layout
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { SFUClient, SFUConfig } from "@/services/sfu-client";
import { ParticipantGrid } from "./ParticipantGrid";
import { Participant } from "./ParticipantTile";
import { useActiveSpeakerGroup } from "@/hooks/video-call/useActiveSpeakerGroup";
import { BandwidthManager } from "@/services/bandwidth-manager";
import { MediaHandler } from "@/lib/webrtc/media-handler";
import { CallStatus } from "@/components/video-call/status/CallStatus";
import { CallTimer } from "@/components/video-call/status/CallTimer";
import { ToggleButton } from "@/components/video-call/controls/ToggleButton";
import { useCallTimer } from "@/hooks/video-call/useCallTimer";

export interface GroupCallRoomProps {
	roomId: string;
	userId: string;
	userName?: string;
	sfuConfig: SFUConfig;
	onLeave?: () => void;
}

export function GroupCallRoom({
	roomId,
	userId,
	userName,
	sfuConfig,
	onLeave,
}: GroupCallRoomProps) {
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
	const [isAudioEnabled, setIsAudioEnabled] = useState(true);
	const [isVideoEnabled, setIsVideoEnabled] = useState(true);
	
	const sfuClientRef = useRef<SFUClient | null>(null);
	const bandwidthManagerRef = useRef<BandwidthManager | null>(null);
	const mediaHandlerRef = useRef<MediaHandler>(new MediaHandler());
	const localStreamRef = useRef<MediaStream | null>(null);
	const callTimer = useCallTimer();

	// Active speaker detection
	const activeSpeaker = useActiveSpeakerGroup({
		sfuClient: sfuClientRef.current!,
		participants: participants.map(p => ({
			userId: p.userId,
			audioProducerId: p.audioProducerId,
		})),
	});

	useEffect(() => {
		initializeCall();

		return () => {
			cleanup();
		};
	}, []);

	/**
	 * Initialize group call
	 */
	const initializeCall = async () => {
		try {
			// 1. Get local media
			const localStream = await mediaHandlerRef.current.getUserMedia({
				video: true,
				audio: true,
			});
			localStreamRef.current = localStream;

			// 2. Connect to SFU
			const sfuClient = new SFUClient(sfuConfig);
			sfuClientRef.current = sfuClient;

			// 3. Wait for connection
			await new Promise<void>((resolve) => {
				sfuClient.getSocket().on('connect', () => {
					resolve();
				});
			});

			// 4. Setup bandwidth manager
			const bandwidthManager = new BandwidthManager({
				sfuClient,
				maxSubscribedVideoStreams: 6,
				prioritizeActiveSpeaker: true,
			});
			bandwidthManagerRef.current = bandwidthManager;

			// 5. Produce local streams
			await produceLocalStreams(sfuClient, localStream);

			// 6. Get existing participants
			const existingProducers = await sfuClient.getProducers();
			updateParticipantsFromProducers(existingProducers);

			// 7. Setup event listeners
			setupSFUEventListeners(sfuClient);

			setCallStatus("connected");
			callTimer.start();
		} catch (error) {
			console.error('[GroupCallRoom] Error initializing call:', error);
			setCallStatus("disconnected");
		}
	};

	/**
	 * Produce local audio/video streams
	 */
	const produceLocalStreams = async (
		sfuClient: SFUClient,
		stream: MediaStream
	): Promise<void> => {
		// This would typically involve:
		// 1. Creating SFU transport
		// 2. Adding tracks to peer connection
		// 3. Producing tracks to SFU
		// Implementation depends on SFU type

		console.log('[GroupCallRoom] Producing local streams');
	};

	/**
	 * Update participants from SFU producers
	 */
	const updateParticipantsFromProducers = (producers: any[]): void => {
		// Group producers by user
		const userProducers = new Map<string, Participant>();

		producers.forEach((producer) => {
			const userId = producer.userId || 'unknown';
			
			if (!userProducers.has(userId)) {
				userProducers.set(userId, {
					userId,
					userName: producer.userName,
					audioProducerId: undefined,
					videoProducerId: undefined,
					isAudioEnabled: true,
					isVideoEnabled: true,
					isScreenSharing: false,
				});
			}

			const participant = userProducers.get(userId)!;
			if (producer.kind === 'audio') {
				participant.audioProducerId = producer.id;
			} else if (producer.kind === 'video') {
				participant.videoProducerId = producer.id;
			}
		});

		setParticipants(Array.from(userProducers.values()));
	};

	/**
	 * Setup SFU event listeners
	 */
	const setupSFUEventListeners = (sfuClient: SFUClient): void => {
		const socket = sfuClient.getSocket();

		socket.on('new-producer', (producer: any) => {
			// Handle new producer (participant joined)
			console.log('[GroupCallRoom] New producer:', producer);
			updateParticipantsFromProducers([producer]);
		});

		socket.on('producer-closed', (producerId: string) => {
			// Handle producer closed (participant left)
			console.log('[GroupCallRoom] Producer closed:', producerId);
			setParticipants(prev =>
				prev.filter(p => 
					p.audioProducerId !== producerId && 
					p.videoProducerId !== producerId
				)
			);
		});
	};

	/**
	 * Toggle audio
	 */
	const handleToggleAudio = async (enabled: boolean) => {
		setIsAudioEnabled(enabled);
		
		// Update SFU producer
		// Implementation depends on SFU
		if (sfuClientRef.current) {
			// Pause/resume audio producer
		}
	};

	/**
	 * Toggle video
	 */
	const handleToggleVideo = async (enabled: boolean) => {
		setIsVideoEnabled(enabled);
		
		// Update SFU producer
		// Implementation depends on SFU
		if (sfuClientRef.current) {
			// Pause/resume video producer
		}
	};

	/**
	 * Leave call
	 */
	const handleLeave = async () => {
		if (sfuClientRef.current) {
			await sfuClientRef.current.leaveRoom();
		}
		
		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach(track => track.stop());
		}

		callTimer.pause();
		onLeave?.();
	};

	/**
	 * Cleanup
	 */
	const cleanup = () => {
		if (sfuClientRef.current) {
			sfuClientRef.current.leaveRoom();
		}
		
		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach(track => track.stop());
		}
	};

	const localParticipant: Participant = {
		userId,
		userName,
		isAudioEnabled,
		isVideoEnabled,
		isScreenSharing: false,
	};

	return (
		<div className="flex flex-col h-screen w-screen bg-gray-900 text-white">
			{/* Header */}
			<div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
				<div className="flex items-center gap-4">
					<CallStatus status={callStatus} />
					<CallTimer startTime={Date.now() - callTimer.duration * 1000} />
					<span className="text-sm text-gray-400">
						{participants.length + 1} participants
					</span>
				</div>
			</div>

			{/* Video Grid */}
			<div className="flex-1 overflow-auto">
				<ParticipantGrid
					participants={participants}
					sfuClient={sfuClientRef.current!}
					localParticipant={localParticipant}
					localStream={localStreamRef.current || undefined}
					activeSpeakerId={activeSpeaker.userId || undefined}
				/>
			</div>

			{/* Controls */}
			<div className="flex items-center justify-center gap-4 p-6 bg-gray-800 border-t border-gray-700">
				<ToggleButton
					type="mic"
					enabled={isAudioEnabled}
					onToggle={handleToggleAudio}
				/>
				<ToggleButton
					type="camera"
					enabled={isVideoEnabled}
					onToggle={handleToggleVideo}
				/>
				<button
					onClick={handleLeave}
					className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
				>
					Leave
				</button>
			</div>
		</div>
	);
}

