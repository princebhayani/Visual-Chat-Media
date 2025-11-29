"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Monitor, MonitorOff, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirebaseAuthContext } from "@/providers/firebase-auth-provider";
import { useConversationStore } from "@/store/chat-store";
import { CallType } from "@/store/call-store";

interface PeerConnection {
	peerConnection: RTCPeerConnection;
	socketId: string;
	userId: string;
	videoElement: HTMLVideoElement | HTMLElement; // Can be video element or container
	audioElement?: HTMLAudioElement; // Audio element for audio calls
	remoteVideoStream?: MediaStream; // Stream for remote video tracks
	remoteAudioStream?: MediaStream; // Stream for remote audio tracks
}

export function getUrlParams(url = window.location.href) {
	const urlStr = url.split("?")[1];
	return new URLSearchParams(urlStr);
}

export default function VideoCallRoom() {
	const { user, isLoading: userLoading } = useFirebaseAuthContext();
	const { selectedConversation } = useConversationStore();
	const [socket, setSocket] = useState<Socket | null>(null);
	const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
	const [isVideoEnabled, setIsVideoEnabled] = useState(true);
	const [isAudioEnabled, setIsAudioEnabled] = useState(true);
	const [isScreenSharing, setIsScreenSharing] = useState(false);
	const [callType, setCallType] = useState<CallType>("video");
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const localStreamRef = useRef<MediaStream | null>(null);
	const localVideoRef = useRef<HTMLVideoElement>(null);
	const peersContainerRef = useRef<HTMLDivElement>(null);
	const roomIdRef = useRef<string>("");
	const callIdRef = useRef<string>("");
	const peersRef = useRef<Map<string, PeerConnection>>(new Map());
	const screenStreamRef = useRef<MediaStream | null>(null);

	const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

	useEffect(() => {
		console.log("🎬 VideoCallRoom useEffect triggered", { user: !!user, userLoading, url: window.location.href });
		
		if (userLoading) {
			console.log("⏳ Waiting for user to load...");
			return;
		}
		
		if (!user) {
			console.log("⚠️ No user available, cannot initialize call");
			return;
		}
		
		console.log("✅ User available, initializing call room");

		const roomId = getUrlParams().get("roomID") || selectedConversation?.id || "default-room";
		const callId = getUrlParams().get("callId") || "";
		const urlCallType = (getUrlParams().get("callType") as CallType) || "video";
		roomIdRef.current = roomId;
		callIdRef.current = callId;
		setCallType(urlCallType);

		// Initialize local media stream FIRST, before connecting socket
		(async () => {
			try {
				console.log("🎥 Requesting media stream...");
				const constraints: MediaStreamConstraints = {
					video: urlCallType === "video",
					audio: true,
				};
				const stream = await navigator.mediaDevices.getUserMedia(constraints);
				console.log("✅ Got media stream:", {
					videoTracks: stream.getVideoTracks().length,
					audioTracks: stream.getAudioTracks().length,
				});
				
				localStreamRef.current = stream;
				setLocalStream(stream);
				setIsVideoEnabled(urlCallType === "video");
				if (localVideoRef.current && urlCallType === "video") {
					localVideoRef.current.srcObject = stream;
				}
				
				// Now that stream is ready, connect socket
				user.getIdToken().then((token) => {
					console.log("🔑 Got Firebase token, connecting socket to:", API_BASE_URL);
					const newSocket = io(API_BASE_URL, {
						auth: { token },
						transports: ["websocket"],
					});

					newSocket.on("connect", () => {
						console.log("✅ Socket connected, stream ready, joining room:", roomId);
						newSocket.emit("join-room", roomId);
					});
					
					newSocket.on("connect_error", (error) => {
						console.error("❌ Socket connection error:", error);
					});
					
					newSocket.on("disconnect", (reason) => {
						console.log("🔌 Socket disconnected:", reason);
					});
					
					newSocket.on("room-joined", (data: { roomId: string }) => {
						console.log("✅ Confirmed: Joined room", data.roomId);
					});

					newSocket.on("user-joined", async (data: { userId: string; socketId: string }) => {
						console.log("User joined:", data);
						// Check if peer connection already exists to avoid duplicates
						if (peersRef.current.has(data.socketId)) {
							console.log("Peer connection already exists for:", data.socketId);
							return;
						}
						
						// Determine who should initiate based on socket ID comparison
						// The user with the "lower" socket ID initiates to avoid conflicts
						const shouldInitiate = newSocket.id < data.socketId;
						console.log(`Creating peer connection - ${shouldInitiate ? 'Initiator' : 'Waiting for offer'}, my socket: ${newSocket.id}, their socket: ${data.socketId}`);
						
						await createPeerConnection(data.socketId, data.userId, newSocket, shouldInitiate);
					});

					newSocket.on("offer", async (data: { offer: RTCSessionDescriptionInit; socketId: string }) => {
						await handleOffer(data.offer, data.socketId, newSocket);
					});

					newSocket.on("answer", async (data: { answer: RTCSessionDescriptionInit; socketId: string }) => {
						await handleAnswer(data.answer, data.socketId);
					});

					newSocket.on("ice-candidate", async (data: { candidate: RTCIceCandidateInit; socketId: string }) => {
						await handleIceCandidate(data.candidate, data.socketId);
					});

					newSocket.on("user-left", (data: { userId: string; socketId: string }) => {
						console.log("User left:", data);
						removePeer(data.socketId);
					});

					newSocket.on("call-declined", (data: { callId: string; roomId: string }) => {
						console.log("📞 Call declined by recipient:", data);
						// Close the call window if this is the declined call
						if (data.callId === callIdRef.current) {
							setTimeout(() => {
								window.close();
							}, 1000);
						}
					});

					setSocket(newSocket);
					
					// Add tracks to any existing peer connections that were created before stream was ready
					peersRef.current.forEach((peer) => {
						stream.getTracks().forEach((track) => {
							// Check if track already added
							const sender = peer.peerConnection.getSenders().find(
								(s) => s.track && s.track.kind === track.kind
							);
							if (!sender) {
								peer.peerConnection.addTrack(track, stream);
								console.log(`✅ Added ${track.kind} track to existing peer connection`);
								
								// If we're the initiator and haven't created offer yet, create it now
								if (peer.peerConnection.signalingState === "stable" && newSocket.id < peer.socketId) {
									createOfferForPeer(peer, newSocket);
								}
							}
						});
					});
				});
			} catch (error) {
				console.error("❌ Error accessing media devices:", error);
				alert("Failed to access camera/microphone. Please check permissions.");
			}
		})();

		return () => {
			console.log("🧹 Cleaning up video call room");
			// Only emit call-ended if user explicitly ended the call (not on unmount/close)
			// We'll handle cleanup without emitting call-ended here
			if (localStreamRef.current) {
				localStreamRef.current.getTracks().forEach((track) => track.stop());
			}
			if (screenStreamRef.current) {
				screenStreamRef.current.getTracks().forEach((track) => track.stop());
			}
			peersRef.current.forEach((peer) => {
				peer.peerConnection.close();
				if (peer.videoElement && peer.videoElement.parentElement) {
					peer.videoElement.parentElement.remove();
				}
			});
			if (socket) {
				socket.disconnect();
			}
		};
	}, [user, userLoading]);


	const createPeerConnection = async (
		targetSocketId: string,
		targetUserId: string,
		socket: Socket,
		isInitiator: boolean
	) => {
		const peerConnection = new RTCPeerConnection({
			iceServers: [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun1.l.google.com:19302" },
			],
		});

		// Add local stream tracks to peer connection
		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach((track) => {
				peerConnection.addTrack(track, localStreamRef.current!);
			});
		}

		// Create container for remote peer
		const container = document.createElement("div");
		container.className = "relative bg-gray-800 rounded-lg overflow-hidden aspect-video";
		container.setAttribute("data-user-id", targetUserId);
		container.setAttribute("data-socket-id", targetSocketId);

		// Create video element for remote peer (only if video call)
		const videoElement = document.createElement("video");
		videoElement.autoplay = true;
		videoElement.playsInline = true;
		videoElement.className = "w-full h-full object-cover";
		
		// Create audio element for remote peer (always needed for audio playback)
		const audioElement = document.createElement("audio");
		audioElement.autoplay = true;
		audioElement.playsInline = true;
		audioElement.style.display = "none"; // Hidden, just for audio playback
		
		// Create audio-only placeholder
		const audioPlaceholder = document.createElement("div");
		audioPlaceholder.className = "flex items-center justify-center h-full w-full";
		audioPlaceholder.innerHTML = `
			<div class="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center">
				<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
				</svg>
			</div>
		`;

		if (callType === "video") {
			container.appendChild(videoElement);
		} else {
			container.appendChild(audioPlaceholder);
		}
		
		// Always append audio element for audio playback (hidden)
		container.appendChild(audioElement);

		if (peersContainerRef.current) {
			peersContainerRef.current.appendChild(container);
		}

		// Create streams for remote media
		const remoteVideoStream = new MediaStream();
		const remoteAudioStream = new MediaStream();
		
		// Handle remote stream - properly handle both video and audio tracks
		peerConnection.ontrack = (event) => {
			console.log("📹 Received remote track:", event.track.kind, "from stream:", event.streams.length > 0 ? event.streams[0].id : "no stream", "track id:", event.track.id);
			
			const track = event.track;
			
			// Handle video track
			if (track.kind === "video" && callType === "video") {
				// Stop any existing video track
				if (remoteVideoStream.getVideoTracks().length > 0) {
					const oldTrack = remoteVideoStream.getVideoTracks()[0];
					oldTrack.stop();
					remoteVideoStream.removeTrack(oldTrack);
				}
				// Add new video track
				remoteVideoStream.addTrack(track);
				videoElement.srcObject = remoteVideoStream;
				console.log("✅ Added remote video track to stream, total tracks:", remoteVideoStream.getTracks().length);
				
				// Handle track ended
				track.onended = () => {
					console.log("Remote video track ended");
					remoteVideoStream.removeTrack(track);
					if (remoteVideoStream.getTracks().length === 0) {
						videoElement.srcObject = null;
					}
				};
			}
			
			// Always handle audio track (for both video and audio calls)
			if (track.kind === "audio") {
				// Stop any existing audio track
				if (remoteAudioStream.getAudioTracks().length > 0) {
					const oldTrack = remoteAudioStream.getAudioTracks()[0];
					oldTrack.stop();
					remoteAudioStream.removeTrack(oldTrack);
				}
				// Add new audio track
				remoteAudioStream.addTrack(track);
				audioElement.srcObject = remoteAudioStream;
				console.log("✅ Added remote audio track to stream, total tracks:", remoteAudioStream.getTracks().length);
				
				// Ensure audio plays
				const playAudio = async () => {
					try {
						await audioElement.play();
						console.log("✅ Remote audio playing");
					} catch (err) {
						console.error("Error playing remote audio:", err);
						// Retry after a short delay
						setTimeout(() => {
							audioElement.play().catch((e) => console.error("Retry audio play failed:", e));
						}, 500);
					}
				};
				playAudio();
				
				// Handle track ended
				track.onended = () => {
					console.log("Remote audio track ended");
					remoteAudioStream.removeTrack(track);
					if (remoteAudioStream.getTracks().length === 0) {
						audioElement.srcObject = null;
					}
				};
			}
		};

		// Handle ICE candidates
		peerConnection.onicecandidate = (event) => {
			if (event.candidate) {
				console.log("🧊 ICE candidate:", event.candidate.type);
				socket.emit("ice-candidate", {
					candidate: event.candidate,
					targetSocketId,
					roomId: roomIdRef.current,
				});
			} else {
				console.log("🧊 ICE gathering complete");
			}
		};
		
		// Monitor connection state
		peerConnection.onconnectionstatechange = () => {
			console.log(`🔗 Connection state changed: ${peerConnection.connectionState} for ${targetSocketId}`);
			if (peerConnection.connectionState === "failed") {
				console.error("❌ Peer connection failed, attempting to restart...");
				// Could implement reconnection logic here
			}
		};
		
		peerConnection.oniceconnectionstatechange = () => {
			console.log(`🧊 ICE connection state: ${peerConnection.iceConnectionState} for ${targetSocketId}`);
		};
		
		peerConnection.onsignalingstatechange = () => {
			console.log(`📡 Signaling state: ${peerConnection.signalingState} for ${targetSocketId}`);
		};

		const peer: PeerConnection = {
			peerConnection,
			socketId: targetSocketId,
			userId: targetUserId,
			videoElement: callType === "video" ? videoElement : container,
			audioElement: audioElement,
			remoteVideoStream: remoteVideoStream,
			remoteAudioStream: remoteAudioStream,
		};

		peersRef.current.set(targetSocketId, peer);
		setPeers((prev) => new Map(prev).set(targetSocketId, peer));

		// Create and send offer if initiator (but only if stream is ready)
		if (isInitiator) {
			// Wait for stream to be ready before creating offer
			const waitForStream = async () => {
				let attempts = 0;
				while ((!localStreamRef.current || localStreamRef.current.getTracks().length === 0) && attempts < 10) {
					console.log(`⏳ Waiting for stream... (attempt ${attempts + 1}/10)`);
					await new Promise(resolve => setTimeout(resolve, 200));
					attempts++;
				}
				
				if (!localStreamRef.current || localStreamRef.current.getTracks().length === 0) {
					console.error("❌ Stream not available after waiting");
					return;
				}
				
				// Ensure tracks are added
				localStreamRef.current.getTracks().forEach((track) => {
					const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === track.kind);
					if (!sender) {
						peerConnection.addTrack(track, localStreamRef.current!);
						console.log(`✅ Added ${track.kind} track before creating offer`);
					}
				});
				
				try {
					const offer = await peerConnection.createOffer({
						offerToReceiveAudio: true,
						offerToReceiveVideo: callType === "video",
					});
					await peerConnection.setLocalDescription(offer);
					console.log("✅ Created and set local offer, sending to:", targetSocketId);
					socket.emit("offer", {
						offer,
						targetSocketId,
						roomId: roomIdRef.current,
					});
				} catch (error) {
					console.error("❌ Error creating offer:", error);
				}
			};
			
			waitForStream();
		}

		return peer;
	};

	const createOfferForPeer = async (peer: PeerConnection, socket: Socket) => {
		if (peer.peerConnection.signalingState !== "stable") {
			console.log("⚠️ Cannot create offer, signaling state:", peer.peerConnection.signalingState);
			return;
		}
		
		try {
			// Ensure we have tracks
			if (localStreamRef.current && localStreamRef.current.getTracks().length > 0) {
				localStreamRef.current.getTracks().forEach((track) => {
					const sender = peer.peerConnection.getSenders().find(s => s.track && s.track.kind === track.kind);
					if (!sender) {
						peer.peerConnection.addTrack(track, localStreamRef.current!);
						console.log(`✅ Added ${track.kind} track before creating offer`);
					}
				});
			}
			
			const offer = await peer.peerConnection.createOffer({
				offerToReceiveAudio: true,
				offerToReceiveVideo: callType === "video",
			});
			await peer.peerConnection.setLocalDescription(offer);
			console.log("✅ Created offer for peer:", peer.socketId);
			socket.emit("offer", {
				offer,
				targetSocketId: peer.socketId,
				roomId: roomIdRef.current,
			});
		} catch (error) {
			console.error("❌ Error creating offer for peer:", error);
		}
	};

	const handleOffer = async (offer: RTCSessionDescriptionInit, socketId: string, socket: Socket) => {
		console.log("📥 Received offer from:", socketId);
		// Check if peer connection already exists
		let peer = peersRef.current.get(socketId);
		if (!peer) {
			console.log("Creating new peer connection for incoming offer");
			peer = await createPeerConnection(socketId, "unknown", socket, false);
		}
		
		try {
			// Ensure we have tracks before answering
			if (localStreamRef.current && localStreamRef.current.getTracks().length > 0) {
				localStreamRef.current.getTracks().forEach((track) => {
					const sender = peer.peerConnection.getSenders().find(s => s.track && s.track.kind === track.kind);
					if (!sender) {
						peer.peerConnection.addTrack(track, localStreamRef.current!);
						console.log(`✅ Added ${track.kind} track before answering`);
					}
				});
			} else {
				console.warn("⚠️ No local stream available when answering offer");
			}
			
			await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
			console.log("✅ Set remote description");
			
			const answer = await peer.peerConnection.createAnswer({
				offerToReceiveAudio: true,
				offerToReceiveVideo: callType === "video",
			});
			await peer.peerConnection.setLocalDescription(answer);
			console.log("✅ Created and set local answer, sending to:", socketId);
			socket.emit("answer", {
				answer,
				targetSocketId: socketId,
				roomId: roomIdRef.current,
			});
		} catch (error) {
			console.error("❌ Error handling offer:", error);
		}
	};

	const handleAnswer = async (answer: RTCSessionDescriptionInit, socketId: string) => {
		const peer = peersRef.current.get(socketId);
		if (peer) {
			await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
		}
	};

	const handleIceCandidate = async (candidate: RTCIceCandidateInit, socketId: string) => {
		const peer = peersRef.current.get(socketId);
		if (peer) {
			await peer.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
		}
	};

	const removePeer = (socketId: string) => {
		const peer = peersRef.current.get(socketId);
		if (peer) {
			peer.peerConnection.close();
			// Remove the container (which contains video or audio placeholder)
			const container = peer.videoElement.parentElement;
			if (container) {
				container.remove();
			} else {
				peer.videoElement.remove();
			}
			// Clean up audio element if it exists
			if (peer.audioElement && peer.audioElement.parentElement) {
				peer.audioElement.remove();
			}
			peersRef.current.delete(socketId);
			setPeers((prev) => {
				const newPeers = new Map(prev);
				newPeers.delete(socketId);
				return newPeers;
			});
		}
	};

	const toggleVideo = async () => {
		if (localStreamRef.current) {
			const videoTrack = localStreamRef.current.getVideoTracks()[0];
			if (videoTrack) {
				if (isVideoEnabled) {
					// Turn off video
					videoTrack.enabled = false;
					setIsVideoEnabled(false);
				} else {
					// Turn on video - need to get new stream with video
					try {
						const stream = await navigator.mediaDevices.getUserMedia({
							video: true,
							audio: true,
						});
						// Replace video track
						const newVideoTrack = stream.getVideoTracks()[0];
						const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
						if (oldVideoTrack && newVideoTrack) {
							localStreamRef.current.removeTrack(oldVideoTrack);
							localStreamRef.current.addTrack(newVideoTrack);
							oldVideoTrack.stop();
							// Update all peer connections
							peersRef.current.forEach((peer) => {
								const sender = peer.peerConnection.getSenders().find(
									(s) => s.track && s.track.kind === "video"
								);
								if (sender) {
									sender.replaceTrack(newVideoTrack);
								}
							});
							if (localVideoRef.current) {
								localVideoRef.current.srcObject = localStreamRef.current;
							}
							setIsVideoEnabled(true);
						}
					} catch (error) {
						console.error("Error enabling video:", error);
					}
				}
			}
		}
	};

	const toggleScreenShare = async () => {
		try {
			if (isScreenSharing) {
				// Stop screen sharing
				if (screenStreamRef.current) {
					screenStreamRef.current.getTracks().forEach((track) => track.stop());
					screenStreamRef.current = null;
				}
				// Get back camera stream
				const stream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: true,
				});
				const newVideoTrack = stream.getVideoTracks()[0];
				const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
				if (oldVideoTrack && newVideoTrack && localStreamRef.current) {
					localStreamRef.current.removeTrack(oldVideoTrack);
					localStreamRef.current.addTrack(newVideoTrack);
					oldVideoTrack.stop();
					// Update all peer connections with proper error handling
					peersRef.current.forEach(async (peer) => {
						const sender = peer.peerConnection.getSenders().find(
							(s) => s.track && s.track.kind === "video"
						);
						if (sender) {
							try {
								await sender.replaceTrack(newVideoTrack);
								console.log("✅ Replaced video track with camera");
							} catch (error) {
								console.error("Error replacing track:", error);
							}
						} else {
							// If no sender exists, add the track
							peer.peerConnection.addTrack(newVideoTrack, localStreamRef.current!);
							console.log("✅ Added new video track");
						}
					});
					if (localVideoRef.current) {
						localVideoRef.current.srcObject = localStreamRef.current;
					}
				}
				setIsScreenSharing(false);
			} else {
				// Start screen sharing
				const screenStream = await navigator.mediaDevices.getDisplayMedia({
					video: {
						displaySurface: "monitor",
						width: { ideal: 1920 },
						height: { ideal: 1080 },
					} as MediaTrackConstraints,
					audio: true,
				});
				screenStreamRef.current = screenStream;
				const screenVideoTrack = screenStream.getVideoTracks()[0];
				const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
				
				if (screenVideoTrack && localStreamRef.current) {
					if (oldVideoTrack) {
						localStreamRef.current.removeTrack(oldVideoTrack);
						oldVideoTrack.stop();
					}
					localStreamRef.current.addTrack(screenVideoTrack);
					
					// Update all peer connections with proper error handling
					peersRef.current.forEach(async (peer) => {
						const sender = peer.peerConnection.getSenders().find(
							(s) => s.track && s.track.kind === "video"
						);
						if (sender) {
							try {
								await sender.replaceTrack(screenVideoTrack);
								console.log("✅ Replaced video track with screen share");
							} catch (error) {
								console.error("Error replacing track with screen share:", error);
							}
						} else {
							// If no sender exists, add the track
							peer.peerConnection.addTrack(screenVideoTrack, localStreamRef.current!);
							console.log("✅ Added screen share track");
						}
					});
					if (localVideoRef.current) {
						localVideoRef.current.srcObject = localStreamRef.current;
					}
				}
				setIsScreenSharing(true);
				setIsVideoEnabled(true);

				// Stop screen share when user stops sharing in browser
				screenVideoTrack.onended = () => {
					toggleScreenShare();
				};
			}
		} catch (error) {
			console.error("Error toggling screen share:", error);
		}
	};

	const toggleAudio = () => {
		if (localStreamRef.current) {
			const audioTrack = localStreamRef.current.getAudioTracks()[0];
			if (audioTrack) {
				audioTrack.enabled = !isAudioEnabled;
				setIsAudioEnabled(!isAudioEnabled);
			}
		}
	};

	const endCall = () => {
		console.log("📞 End call button clicked");
		
		// Notify others that the call has ended
		if (socket && callIdRef.current && roomIdRef.current) {
			console.log("📤 Emitting call-ended event:", {
				callId: callIdRef.current,
				roomId: roomIdRef.current,
			});
			socket.emit("call-ended", {
				callId: callIdRef.current,
				roomId: roomIdRef.current,
			});
		} else {
			console.warn("⚠️ Cannot emit call-ended - missing socket, callId, or roomId", {
				hasSocket: !!socket,
				callId: callIdRef.current,
				roomId: roomIdRef.current,
			});
		}

		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach((track) => track.stop());
		}
		if (screenStreamRef.current) {
			screenStreamRef.current.getTracks().forEach((track) => track.stop());
		}
		peersRef.current.forEach((peer) => {
			peer.peerConnection.close();
			// Remove the container (which contains video or audio placeholder)
			const container = peer.videoElement.parentElement || peer.videoElement;
			if (container && container.parentElement) {
				container.remove();
			} else if (container) {
				container.remove();
			}
		});
		if (socket) {
			socket.disconnect();
		}
		window.close();
	};

	if (userLoading) {
		return (
			<div className='flex min-h-screen flex-col items-center justify-center gap-2 bg-left-panel text-gray-100'>
				<p className='text-lg font-semibold'>Loading...</p>
			</div>
		);
	}
	
	if (!user) {
		return (
			<div className='flex min-h-screen flex-col items-center justify-center gap-2 bg-left-panel text-gray-100'>
				<p className='text-lg font-semibold'>Please sign in to start a video call.</p>
				<p className='text-sm text-gray-400'>Return to the dashboard and sign in with Google.</p>
			</div>
		);
	}

	const peerCount = peers.size;
	const totalParticipants = peerCount + 1; // +1 for local user

	return (
		<div className='flex flex-col h-screen w-screen bg-gray-900 text-white'>
			{/* Header */}
			<div className='flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700'>
				<div className='flex items-center gap-3'>
					<Users className='h-5 w-5' />
					<span className='font-semibold'>
						{selectedConversation?.name || "Video Call"} ({totalParticipants} participants)
					</span>
				</div>
			</div>

			{/* Video Grid */}
			<div className='flex-1 p-4 overflow-auto'>
				<div ref={peersContainerRef} className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full'>
					{/* Local Video */}
					<div className='relative bg-gray-800 rounded-lg overflow-hidden aspect-video'>
						{callType === "video" && (
							<video
								ref={localVideoRef}
								autoPlay
								playsInline
								muted
								className='w-full h-full object-cover'
							/>
						)}
						{callType === "audio" && (
							<div className='flex items-center justify-center h-full'>
								<div className='w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center'>
									<Phone size={48} className='text-white' />
								</div>
							</div>
						)}
						<div className='absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm'>
							You {callType === "video" && !isVideoEnabled && "(Video Off)"} {!isAudioEnabled && "(Muted)"} {isScreenSharing && "(Sharing)"}
						</div>
					</div>
				</div>
			</div>

			{/* Controls */}
			<div className='flex items-center justify-center gap-4 p-6 bg-gray-800 border-t border-gray-700'>
				<Button
					variant={isAudioEnabled ? "default" : "destructive"}
					size='lg'
					onClick={toggleAudio}
					className='rounded-full w-14 h-14'
					title={isAudioEnabled ? "Mute" : "Unmute"}
				>
					{isAudioEnabled ? <Mic className='h-6 w-6' /> : <MicOff className='h-6 w-6' />}
				</Button>

				{callType === "video" && (
					<>
						<Button
							variant={isVideoEnabled ? "default" : "destructive"}
							size='lg'
							onClick={toggleVideo}
							className='rounded-full w-14 h-14'
							title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
						>
							{isVideoEnabled ? <Video className='h-6 w-6' /> : <VideoOff className='h-6 w-6' />}
						</Button>

						<Button
							variant={isScreenSharing ? "default" : "outline"}
							size='lg'
							onClick={toggleScreenShare}
							className='rounded-full w-14 h-14'
							title={isScreenSharing ? "Stop sharing" : "Share screen"}
						>
							{isScreenSharing ? <MonitorOff className='h-6 w-6' /> : <Monitor className='h-6 w-6' />}
						</Button>
					</>
				)}

				<Button variant='destructive' size='lg' onClick={endCall} className='rounded-full w-14 h-14' title='End call'>
					<PhoneOff className='h-6 w-6' />
				</Button>
			</div>
		</div>
	);
}

