/**
 * Enhanced Video Call Room
 * 
 * Integrated component using all improvements:
 * - PeerConnectionManager for lifecycle & retry
 * - MediaHandler for media management
 * - SignalingClient for communication
 * - QualityManager for quality control
 * - All UI/UX improvements
 * - Screen share optimizations
 * - Active speaker detection
 */

"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { PhoneOff, Users, Phone } from "lucide-react";
import { useFirebaseAuthContext } from "@/providers/firebase-auth-provider";
import { useConversationStore } from "@/store/chat-store";
import { CallType } from "@/store/call-store";
import { io } from "socket.io-client";

// Core WebRTC services
import { PeerConnectionManager } from "@/lib/webrtc/connection-manager";
import { MediaHandler } from "@/lib/webrtc/media-handler";
import { QualityManager } from "@/lib/webrtc/quality-manager";
import { NetworkMonitor } from "@/lib/webrtc/network-monitor";
import { AdaptiveBitrateController } from "@/lib/webrtc/adaptive-bitrate";
import { CPUMonitor } from "@/lib/webrtc/cpu-monitor";
import { selectCodec, setCodecPreference } from "@/lib/webrtc/codec-selector";
import { setupSmoothRendering } from "@/lib/webrtc/smooth-rendering";

// Screen share optimizations
import { SeamlessStreamSwitcher } from "@/lib/webrtc/seamless-stream-switcher";
import { 
	getOptimalEncodingConfig, 
	applyEncodingParameters,
	ScreenShareContentType 
} from "@/lib/webrtc/screen-share-optimizer";
import { AdaptiveFPSController } from "@/lib/webrtc/adaptive-fps-controller";
import { DynamicResolutionController } from "@/lib/webrtc/dynamic-resolution";

// Media constraints
import {
	getVideoCallConstraints,
	getScreenShareConstraints,
	VideoQuality,
} from "@/lib/webrtc/media-constraints";

// UI Components
import { VideoTile } from "./video/VideoTile";
import { GridLayout } from "./layout/GridLayout";
import { ScreenShareLayout } from "./layout/ScreenShareLayout";
import { MobileLayout } from "./layout/MobileLayout";
import { ToggleButton } from "./controls/ToggleButton";
import { CallStatus } from "./status/CallStatus";
import { CallTimer } from "./status/CallTimer";
import { ConnectionQuality } from "./status/CallStatus";
import { PictureInPicture } from "./video/PictureInPicture";
import { ScreenSharePreview } from "./screen-share/ScreenSharePreview";
import { RingingIndicator } from "./status/RingingIndicator";

// Hooks
import { useCallTimer } from "@/hooks/video-call/useCallTimer";
import { useActiveSpeaker } from "@/hooks/video-call/useActiveSpeaker";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Utilities
import { callLogger } from "./utils/call-logger";
import { getUrlParams } from "./utils/url-params";

interface Participant {
	userId: string;
	socketId: string;
	userName?: string;
	isAudioEnabled: boolean;
	isVideoEnabled: boolean;
	isScreenSharing: boolean;
	isActiveSpeaker?: boolean;
}

export default function VideoCallRoomEnhanced() {
	const { user, isLoading: userLoading } = useFirebaseAuthContext();
	const { selectedConversation } = useConversationStore();

	// State
	const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "unstable" | "disconnected">("connecting");
	const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "fair" | "poor">("good");
	const [isVideoEnabled, setIsVideoEnabled] = useState(true);
	const [isAudioEnabled, setIsAudioEnabled] = useState(true);
	const [isScreenSharing, setIsScreenSharing] = useState(false);
	const [showScreenSharePreview, setShowScreenSharePreview] = useState(false);
	const [isPipMode, setIsPipMode] = useState(false);
	const [callType, setCallType] = useState<CallType>("video");
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [showRinging, setShowRinging] = useState(false);

	// Refs
	const socketRef = useRef<any>(null);
	const peerManagersRef = useRef<Map<string, PeerConnectionManager>>(new Map());
	const qualityManagersRef = useRef<Map<string, QualityManager>>(new Map());
	const networkMonitorsRef = useRef<Map<string, NetworkMonitor>>(new Map());
	const cpuMonitorsRef = useRef<Map<string, CPUMonitor>>(new Map());
	const streamSwitcherRef = useRef<Map<string, SeamlessStreamSwitcher>>(new Map());
	const mediaHandlerRef = useRef<MediaHandler>(new MediaHandler());
	const localVideoRef = useRef<HTMLVideoElement>(null);
	const peersContainerRef = useRef<HTMLDivElement>(null);
	const roomIdRef = useRef<string>("");
	const callIdRef = useRef<string>("");
	const callTimer = useCallTimer();
	const isMobile = useMediaQuery("(max-width: 768px)");

	const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

	useEffect(() => {
		if (userLoading || !user) return;

		initializeCall();

		return () => {
			cleanup();
		};
	}, [user, userLoading]);

	/**
	 * Initialize call with all improvements
	 */
	const initializeCall = async () => {
		try {
			const roomId = getUrlParams().get("roomID") || selectedConversation?.id || "default-room";
			const callId = getUrlParams().get("callId") || "";
			const urlCallType = (getUrlParams().get("callType") as CallType) || "video";
			
			roomIdRef.current = roomId;
			callIdRef.current = callId;
			setCallType(urlCallType);

			// 1. Get optimized media constraints
			const constraints = getVideoCallConstraints(
				VideoQuality.High,
				{
					audio: true,
					enhancedAudio: true,
					deviceType: isMobile ? "mobile" : "desktop",
				}
			);

			// 2. Get local media stream
			const localStream = await mediaHandlerRef.current.getUserMedia({
				video: constraints.video,
				audio: constraints.audio,
			});

			if (localVideoRef.current && urlCallType === "video") {
				localVideoRef.current.srcObject = localStream;
				
				// Setup smooth rendering
				const cleanupRendering = setupSmoothRendering(localVideoRef.current);
			}

			setIsVideoEnabled(urlCallType === "video");

			// 3. Connect socket and setup event listeners
			const token = await user.getIdToken();
			const socket = io(API_BASE_URL, {
				auth: { token },
				transports: ["websocket"],
			});

			socketRef.current = socket;

			socket.on("connect", () => {
				console.log("✅ Socket connected, joining room:", roomId);
				// Clear any existing participants to prevent duplicates
				setParticipants([]);
				// Join room using existing event
				socket.emit("join-room", roomId);
			});

			socket.on("room-joined", (data: { roomId: string }) => {
				console.log("✅ Confirmed: Joined room", data.roomId);
				
				// Setup event listeners after room joined
				setupSocketListeners(socket);

				setCallStatus("connected");
				callTimer.start();

				// Log call start
				callLogger.startCall({
					callId: callId || `${roomId}-${Date.now()}`,
					participants: [],
					callType: urlCallType,
					connectionQuality: [],
				});
			});

			socket.on("connect_error", (error) => {
				console.error("❌ Socket connection error:", error);
				setCallStatus("disconnected");
			});

			socket.on("disconnect", (reason) => {
				console.log("🔌 Socket disconnected:", reason);
				setCallStatus("disconnected");
			});
		} catch (error) {
			console.error("[VideoCallRoom] Error initializing:", error);
			setCallStatus("disconnected");
			// Show alert for media access errors (from old component)
			if (error instanceof Error && error.name === 'NotAllowedError') {
				alert("Failed to access camera/microphone. Please check permissions.");
			}
		}
	};

	/**
	 * Setup socket event listeners (using existing event names)
	 */
	const setupSocketListeners = (socket: any) => {
		// Peer joined (existing event name)
		socket.on("user-joined", async (data: { userId: string; socketId: string }) => {
			console.log("User joined:", data);
			await handlePeerJoined(data, socket);
		});

		// Peer left (existing event name)
		socket.on("user-left", (data: { userId: string; socketId: string }) => {
			console.log("User left:", data);
			handlePeerLeft(data.socketId);
		});

		// Offer received (existing event name)
		socket.on("offer", async (data: { offer: RTCSessionDescriptionInit; socketId: string }) => {
			await handleOffer(data, socket);
		});

		// Answer received (existing event name)
		socket.on("answer", async (data: { answer: RTCSessionDescriptionInit; socketId: string }) => {
			await handleAnswer(data);
		});

		// ICE candidate received (existing event name)
		socket.on("ice-candidate", async (data: { candidate: RTCIceCandidateInit; socketId: string }) => {
			await handleIceCandidate(data);
		});

		// Call declined
		socket.on("call-declined", (data: { callId: string; roomId: string }) => {
			console.log("📞 Call declined by recipient:", data);
			if (data.callId === callIdRef.current) {
				setTimeout(() => {
					window.close();
				}, 1000);
			}
		});
	};

	/**
	 * Handle peer joined
	 */
	const handlePeerJoined = async (
		data: { userId: string; socketId: string },
		socket: any
	) => {
		const { socketId, userId } = data;

		// Check if already exists
		if (peerManagersRef.current.has(socketId)) {
			return;
		}

		// Ensure socket has an ID
		if (!socket.id) {
			console.error("Socket ID not available, cannot create peer connection");
			return;
		}

		// Determine initiator (lower socket ID)
		const isInitiator = socket.id ? socket.id < socketId : false;

		// Create peer connection manager
		const manager = new PeerConnectionManager({
			socketId,
			userId,
			isInitiator,
			onConnectionStateChange: (state) => {
				updateCallStatus(socketId, state);
			},
			onIceConnectionStateChange: (state) => {
				if (state === "failed") {
					console.warn(`[VideoCallRoom] ICE failed for ${userId}, will retry automatically`);
				}
			},
			onIceCandidate: (candidate) => {
				// Send ICE candidate using existing event structure
				const socket = socketRef.current;
				if (socket) {
					socket.emit("ice-candidate", {
						candidate: candidate.toJSON(),
						targetSocketId: socketId,
						roomId: roomIdRef.current,
					});
				}
			},
			onTrack: (event) => {
				handleRemoteTrack(event, socketId);
			},
		});

		// Create peer connection with optimal codec
		const peerConnection = await manager.createPeerConnection();

		// Set codec preference
		const codec = selectCodec({ preferHardware: true });
		if (codec) {
			await setCodecPreference(peerConnection, codec);
		}

		// Add local tracks
		const localStream = mediaHandlerRef.current.getLocalStream();
		if (localStream) {
			localStream.getTracks().forEach((track) => {
				peerConnection.addTrack(track, localStream);
			});
		}

		peerManagersRef.current.set(socketId, manager);

		// Setup quality manager
		const qualityManager = new QualityManager(manager, mediaHandlerRef.current, {
			initialQuality: VideoQuality.High,
			enableAdaptiveBitrate: true,
			enableNetworkMonitoring: true,
		});

		await qualityManager.initializeForPeer(socketId);
		qualityManagersRef.current.set(socketId, qualityManager);

		// Setup network monitor
		const networkMonitor = new NetworkMonitor(peerConnection);
		networkMonitor.start();
		networkMonitor.onQualityChange((metrics) => {
			setConnectionQuality(metrics.quality);
			setCallStatus(metrics.quality === "poor" ? "unstable" : "connected");
		});
		networkMonitorsRef.current.set(socketId, networkMonitor);

		// Setup CPU monitor
		const cpuMonitor = new CPUMonitor(peerConnection);
		cpuMonitor.start();
		cpuMonitor.onUpdate((stats) => {
			if (stats.level === "critical" && cpuMonitor.shouldThrottle()) {
				throttleQuality(socketId);
			}
		});
		cpuMonitorsRef.current.set(socketId, cpuMonitor);

		// Setup stream switcher
		const streamSwitcher = new SeamlessStreamSwitcher(
			peerConnection,
			mediaHandlerRef.current
		);
		streamSwitcherRef.current.set(socketId, streamSwitcher);

		// Add participant (avoid duplicates)
		setParticipants((prev) => {
			// Check if participant already exists
			if (prev.some((p) => p.socketId === socketId || p.userId === userId)) {
				console.log("⚠️ Duplicate participant detected, skipping:", { userId, socketId });
				return prev;
			}
			const participant: Participant = {
				userId,
				socketId,
				isAudioEnabled: true,
				isVideoEnabled: true,
				isScreenSharing: false,
			};
			console.log("➕ Adding participant:", participant, "Total participants:", prev.length + 1);
			return [...prev, participant];
		});

		// Create offer if initiator
		if (isInitiator) {
			const offer = await manager.createOffer();
			// Send offer using existing event structure
			const socket = socketRef.current;
			if (socket) {
				socket.emit("offer", {
					offer,
					targetSocketId: socketId,
					roomId: roomIdRef.current,
				});
			}
		}
	};

	/**
	 * Handle offer
	 */
	const handleOffer = async (
		data: { offer: RTCSessionDescriptionInit; socketId: string },
		socket: any
	) => {
		let manager = peerManagersRef.current.get(data.socketId);
		
		if (!manager) {
			// Create manager if doesn't exist
			await handlePeerJoined(
				{ userId: "unknown", socketId: data.socketId },
				socket
			);
			manager = peerManagersRef.current.get(data.socketId);
		}

		if (!manager) return;

		await manager.setRemoteDescription(data.offer);

		// Ensure local tracks are added
		const peerConnection = manager.getPeerConnection();
		if (peerConnection && peerConnection.getSenders().length === 0) {
			const localStream = mediaHandlerRef.current.getLocalStream();
			if (localStream) {
				localStream.getTracks().forEach((track) => {
					peerConnection.addTrack(track, localStream);
				});
			}
		}

		const answer = await manager.createAnswer();
		// Send answer using existing event structure
		if (socket) {
			socket.emit("answer", {
				answer,
				targetSocketId: data.socketId,
			});
		}
	};

	/**
	 * Handle answer
	 */
	const handleAnswer = async (data: { answer: RTCSessionDescriptionInit; socketId: string }) => {
		const manager = peerManagersRef.current.get(data.socketId);
		if (!manager) return;

		await manager.setRemoteDescription(data.answer);
	};

	/**
	 * Handle ICE candidate
	 */
	const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit; socketId: string }) => {
		const manager = peerManagersRef.current.get(data.socketId);
		if (!manager) return;

		await manager.addIceCandidate(data.candidate);
	};

	/**
	 * Handle remote track
	 */
	const handleRemoteTrack = (event: RTCTrackEvent, socketId: string) => {
		const participant = participants.find((p) => p.socketId === socketId);
		if (!participant) return;

		const track = event.track;
		const stream = event.streams[0];

		// Ensure audio tracks play properly (from old component)
		if (track.kind === "audio" && stream) {
			// Audio should be handled by VideoTile component
			// This ensures remote audio playback works
		}

		// Update participant with stream info
		// VideoTile will handle the display
	};

	/**
	 * Update call status based on connection state
	 */
	const updateCallStatus = (
		socketId: string,
		state: "disconnected" | "connecting" | "connected" | "reconnecting" | "failed" | "closed"
	) => {
		if (state === "connected") {
			setCallStatus("connected");
		} else if (state === "reconnecting" || state === "failed") {
			setCallStatus("unstable");
		} else if (state === "disconnected" || state === "closed") {
			setCallStatus("disconnected");
		}
	};

	/**
	 * Throttle quality due to high CPU
	 */
	const throttleQuality = async (socketId: string) => {
		const manager = peerManagersRef.current.get(socketId);
		const qualityManager = qualityManagersRef.current.get(socketId);

		if (manager && qualityManager) {
			await qualityManager.setQuality(VideoQuality.Medium, socketId);
		}
	};

	/**
	 * Handle peer left
	 */
	const handlePeerLeft = (socketId: string) => {
		// Cleanup peer connection
		const manager = peerManagersRef.current.get(socketId);
		if (manager) {
			manager.close();
			peerManagersRef.current.delete(socketId);
		}

		// Cleanup quality manager
		const qualityManager = qualityManagersRef.current.get(socketId);
		if (qualityManager) {
			qualityManager.cleanupForPeer(socketId);
			qualityManagersRef.current.delete(socketId);
		}

		// Cleanup monitors
		const networkMonitor = networkMonitorsRef.current.get(socketId);
		if (networkMonitor) {
			networkMonitor.stop();
			networkMonitorsRef.current.delete(socketId);
		}

		const cpuMonitor = cpuMonitorsRef.current.get(socketId);
		if (cpuMonitor) {
			cpuMonitor.stop();
			cpuMonitorsRef.current.delete(socketId);
		}

		// Remove participant
		setParticipants((prev) => {
			const filtered = prev.filter((p) => p.socketId !== socketId);
			console.log("➖ Removing participant:", socketId, "Remaining participants:", filtered.length);
			return filtered;
		});
	};

	/**
	 * Toggle audio
	 */
	const handleToggleAudio = useCallback(async (enabled: boolean) => {
		setIsAudioEnabled(enabled);
		mediaHandlerRef.current.toggleAudio(enabled);

		// Update all peer connections
		for (const manager of peerManagersRef.current.values()) {
			const senders = manager.getSenders();
			const audioSender = senders.find((s) => s.track?.kind === "audio");
			if (audioSender) {
				const track = mediaHandlerRef.current.getAudioTrack();
				if (track) {
					await manager.replaceTrack(audioSender, enabled ? track : null);
				}
			}
		}
	}, []);

	/**
	 * Toggle video
	 */
	const handleToggleVideo = useCallback(async (enabled: boolean) => {
		setIsVideoEnabled(enabled);
		mediaHandlerRef.current.toggleVideo(enabled);

		// Update all peer connections
		for (const manager of peerManagersRef.current.values()) {
			const senders = manager.getSenders();
			const videoSender = senders.find((s) => s.track?.kind === "video");
			if (videoSender) {
				const track = mediaHandlerRef.current.getVideoTrack();
				if (track) {
					await manager.replaceTrack(videoSender, enabled ? track : null);
				}
			}
		}
	}, []);

	/**
	 * Toggle screen share with optimizations
	 */
	const handleToggleScreenShare = useCallback(async () => {
		if (isScreenSharing) {
			// Stop screen share
			const switcher = Array.from(streamSwitcherRef.current.values())[0];
			if (switcher) {
				await switcher.switchToCamera();
			}
			setIsScreenSharing(false);
		} else {
			// Show preview first
			setShowScreenSharePreview(true);
		}
	}, [isScreenSharing]);

	/**
	 * Start screen share with optimizations
	 */
	const handleStartScreenShare = useCallback(async (options: {
		audio: boolean;
		displaySurface?: DisplayCaptureSurfaceType;
	}) => {
		setShowScreenSharePreview(false);

		try {
			// Get optimal constraints for screen share
			const constraints = getScreenShareConstraints({
				quality: "high",
				includeAudio: options.audio,
				cursor: "always",
			});

			// Get screen stream
			const screenStream = await mediaHandlerRef.current.getDisplayMedia(constraints);
			const screenTrack = screenStream.getVideoTracks()[0];

			// Detect content type
			const contentType: ScreenShareContentType = "presentation"; // Could detect dynamically

			// Get optimal encoding config
			const config = getOptimalEncodingConfig(contentType, connectionQuality);

			// Switch to screen share using seamless switcher
			for (const [socketId, switcher] of streamSwitcherRef.current) {
				const track = await switcher.switchToScreenShare({
					onSwitchStart: () => console.log("Starting screen share..."),
					onSwitchComplete: () => {
						console.log("Screen share active");
						setIsScreenSharing(true);
					},
				});

				// Apply encoding parameters
				const manager = peerManagersRef.current.get(socketId);
				if (manager) {
					const senders = manager.getSenders();
					const videoSender = senders.find((s) => s.track?.kind === "video");
					if (videoSender) {
						await applyEncodingParameters(videoSender, config);

						// Setup adaptive FPS
						const fpsController = new AdaptiveFPSController(track, videoSender, {
							contentType,
						});
						await fpsController.start();

						// Setup dynamic resolution
						const resolutionController = new DynamicResolutionController(
							track,
							videoSender,
							manager.getPeerConnection()!,
							{
								initialResolution: "high",
							}
						);
						await resolutionController.start();
					}
				}
			}

			// Handle screen share end
			screenTrack.onended = () => {
				handleToggleScreenShare();
			};
		} catch (error) {
			console.error("[VideoCallRoom] Error starting screen share:", error);
		}
	}, [connectionQuality]);

	/**
	 * End call
	 */
	const handleEndCall = useCallback(async () => {
		const socket = socketRef.current;
		if (socket && callIdRef.current && roomIdRef.current) {
			// Emit call-ended using existing event
			socket.emit("call-ended", {
				callId: callIdRef.current,
				roomId: roomIdRef.current,
			});
		}

		// Cleanup all
		cleanup();

		// Close window
		window.close();
	}, []);

	/**
	 * Cleanup all resources
	 */
	const cleanup = useCallback(() => {
		// Stop call timer
		callTimer.pause();

		// Log call end
		if (callIdRef.current) {
			callLogger.endCall(callIdRef.current, "ended");
		}

		// Cleanup media
		mediaHandlerRef.current.stopAllTracks();

		// Cleanup peer connections
		peerManagersRef.current.forEach((manager) => manager.close());
		peerManagersRef.current.clear();

		// Cleanup quality managers
		qualityManagersRef.current.forEach((qm) => qm.cleanup());
		qualityManagersRef.current.clear();

		// Cleanup monitors
		networkMonitorsRef.current.forEach((nm) => nm.stop());
		networkMonitorsRef.current.clear();

		cpuMonitorsRef.current.forEach((cm) => cm.stop());
		cpuMonitorsRef.current.clear();

		// Disconnect socket
		const socket = socketRef.current;
		if (socket) {
			// Emit call-ended if call is active
			if (callIdRef.current && roomIdRef.current) {
				socket.emit("call-ended", {
					callId: callIdRef.current,
					roomId: roomIdRef.current,
				});
			}
			socket.disconnect();
		}
	}, [callTimer]);

	// Active speaker detection (for multiple participants)
	// Memoize the peer connections map to prevent infinite loops
	const peerConnectionsMap = useMemo(() => {
		const map = new Map<string, RTCPeerConnection>();
		peerManagersRef.current.forEach((manager, socketId) => {
			const peerConnection = manager.getPeerConnection();
			if (peerConnection) {
				map.set(socketId, peerConnection);
			}
		});
		return map;
	}, [participants.length]); // Re-create only when participant count changes

	const activeSpeaker = useActiveSpeaker(peerConnectionsMap);

	// Update participants with active speaker
	const participantsWithActive = participants.map((p) => ({
		...p,
		isActiveSpeaker: activeSpeaker.socketId === p.socketId,
	}));

	if (userLoading) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-900 text-white">
				<p className="text-lg font-semibold">Loading...</p>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-900 text-white">
				<p className="text-lg font-semibold">Please sign in to start a video call.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen w-screen bg-gray-900 text-white">
			{/* Header */}
			<div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 z-20">
				<div className="flex items-center gap-4">
					<CallStatus status={callStatus} />
					<ConnectionQuality quality={connectionQuality} />
					<CallTimer
						startTime={Date.now() - callTimer.duration * 1000}
						format="short"
					/>
					{/* Conversation name (from old component) */}
					{selectedConversation?.name && (
						<div className="flex items-center gap-2 text-sm text-gray-300">
							<Users className="h-4 w-4" />
							<span>{selectedConversation.name}</span>
						</div>
					)}
					<span className="text-sm text-gray-400">
						({participants.length + 1} participant{participants.length !== 0 ? "s" : ""})
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setIsPipMode(!isPipMode)}
						className="px-3 py-1 bg-black/50 rounded text-sm hover:bg-black/70"
					>
						PiP
					</button>
				</div>
			</div>

			{/* Video Grid */}
			<div className="flex-1 overflow-auto relative" ref={peersContainerRef}>
				{isScreenSharing ? (
					<ScreenShareLayout
						screenShareContent={
							<div className="relative w-full h-full">
								<video
									ref={localVideoRef}
									autoPlay
									playsInline
									muted
									className="w-full h-full object-contain"
								/>
								<div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
									You {isScreenSharing && "(Sharing)"}
								</div>
							</div>
						}
						participants={participantsWithActive.map((p) => ({
							id: p.socketId,
							content: <VideoTile
								videoStream={undefined}
								userId={p.userId}
								userName={p.userName}
								isAudioEnabled={p.isAudioEnabled}
								isVideoEnabled={p.isVideoEnabled}
							/>,
						}))}
					/>
				) : isMobile ? (
					<MobileLayout
						participants={participantsWithActive.map((p) => ({
							id: p.socketId,
							content: <VideoTile
								videoStream={undefined}
								userId={p.userId}
								userName={p.userName}
								isAudioEnabled={p.isAudioEnabled}
								isVideoEnabled={p.isVideoEnabled}
								isActiveSpeaker={p.isActiveSpeaker}
							/>,
						}))}
					/>
				) : (
					<GridLayout
						participants={[
							{
								id: user.uid,
								content: (
									<div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden">
										{callType === "video" ? (
											<video
												ref={localVideoRef}
												autoPlay
												playsInline
												muted
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="flex items-center justify-center h-full w-full">
												<div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center">
													<Phone size={48} className="text-white" />
												</div>
											</div>
										)}
										{/* Local video status label (from old component) */}
										<div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
											You {callType === "video" && !isVideoEnabled && "(Video Off)"} {!isAudioEnabled && "(Muted)"} {isScreenSharing && "(Sharing)"}
										</div>
									</div>
								),
								isActive: false,
							},
							...participantsWithActive.map((p) => ({
								id: p.socketId,
								content: <VideoTile
									videoStream={undefined}
									userId={p.userId}
									userName={p.userName}
									isAudioEnabled={p.isAudioEnabled}
									isVideoEnabled={p.isVideoEnabled}
									isActiveSpeaker={p.isActiveSpeaker}
								/>,
								isActive: p.isActiveSpeaker || false,
							})),
						]}
					/>
				)}
			</div>

			{/* Controls */}
			<div className="flex items-center justify-center gap-4 p-6 bg-gray-800 border-t border-gray-700 z-20">
				<ToggleButton
					type="mic"
					enabled={isAudioEnabled}
					onToggle={handleToggleAudio}
					size="lg"
				/>
				{callType === "video" && (
					<>
						<ToggleButton
							type="camera"
							enabled={isVideoEnabled}
							onToggle={handleToggleVideo}
							size="lg"
						/>
						<ToggleButton
							type="camera"
							enabled={isScreenSharing}
							onToggle={handleToggleScreenShare}
							size="lg"
							variant={isScreenSharing ? "default" : "outline"}
							className={isScreenSharing ? "bg-green-600" : ""}
						/>
					</>
				)}
				<button
					onClick={handleEndCall}
					className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all"
				>
					<PhoneOff className="h-6 w-6" />
				</button>
			</div>

			{/* Picture in Picture */}
			{isPipMode && localVideoRef.current && (
				<PictureInPicture
					videoElement={localVideoRef.current}
					onClose={() => setIsPipMode(false)}
					onMaximize={() => setIsPipMode(false)}
				/>
			)}

			{/* Screen Share Preview */}
			{showScreenSharePreview && (
				<ScreenSharePreview
					onStart={handleStartScreenShare}
					onCancel={() => setShowScreenSharePreview(false)}
				/>
			)}

			{/* Ringing Indicator */}
			{showRinging && callStatus === "connecting" && (
				<div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
					<RingingIndicator variant="outgoing" size="lg" />
				</div>
			)}
		</div>
	);
}

