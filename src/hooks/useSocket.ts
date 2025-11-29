"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useFirebaseAuthContext } from "@/providers/firebase-auth-provider";
import { useCallStore } from "@/store/call-store";
import toast from "react-hot-toast";

let globalSocket: Socket | null = null;

function setupSocketListeners(
	socket: Socket,
	user: any,
	setIncomingCall: (call: any) => void
) {
	// Remove existing listeners to avoid duplicates
	socket.removeAllListeners();

	socket.on("connect", () => {
		console.log("✅ Socket connected for notifications, socket ID:", socket.id);
		// Emit a custom event that useConversationRooms can listen to
		// This ensures rooms are rejoined on reconnect
		setTimeout(() => {
			socket.emit("socket-ready-for-rooms");
		}, 100);
	});

	socket.on("disconnect", () => {
		console.log("❌ Socket disconnected");
	});

	socket.on("connect_error", (error) => {
		console.error("❌ Socket connection error:", error);
	});

	socket.on("incoming-call", (data: {
		callId: string;
		roomId: string;
		callerId: string;
		callerName?: string;
		callerAvatar?: string;
		conversationId?: string;
		callType?: "video" | "audio";
	}) => {
		console.log("🔔 Received incoming-call event:", data);
		console.log("Current user ID:", user.uid);
		console.log("Caller ID:", data.callerId);
		
		// Don't show notification if it's from the current user
		if (data.callerId === user.uid) {
			console.log("⚠️ Ignoring call notification from self");
			return;
		}
		
		console.log("✅ Setting incoming call notification");
		setIncomingCall(data);
	});

	socket.on("call-cancelled", (data: { callId: string }) => {
		console.log("📞 Call cancelled:", data);
		setIncomingCall(null);
	});

	socket.on("call-ended", (data: { callId: string; roomId: string }) => {
		// Caller ended the call, dismiss notification
		console.log("📞 Call ended by caller:", data);
		setIncomingCall(null);
	});

	socket.on("call-accepted", (data: { callId: string; roomId: string }) => {
		// This is received by the caller when someone accepts
		// The person who accepted already opened the window in the notification component
		console.log("✅ Call accepted:", data);
	});

	socket.on("call-declined", (data: { callId: string; roomId: string; declinedBy?: string }) => {
		// This is received by the caller when someone declines
		console.log("❌ Call declined:", data);
		toast.error("Call declined", {
			icon: "📞",
			duration: 3000,
			position: "top-center",
		});
		// Close the call window if it was opened by the caller
		if (typeof window !== "undefined" && window.location.pathname === "/video-call") {
			const urlParams = new URLSearchParams(window.location.search);
			const callId = urlParams.get("callId");
			if (callId === data.callId) {
				// Small delay to show the toast before closing
				setTimeout(() => {
					if (window.opener) {
						window.close();
					}
				}, 1500);
			}
		}
	});
}

export function useSocket() {
	const { user } = useFirebaseAuthContext();
	const [socket, setSocket] = useState<Socket | null>(null);
	const { setIncomingCall } = useCallStore();
	const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

	useEffect(() => {
		if (!user) {
			if (globalSocket) {
				globalSocket.disconnect();
				globalSocket = null;
			}
			setSocket(null);
			return;
		}

		// Reuse existing socket if available, but ensure listeners are set up
		if (globalSocket && globalSocket.connected) {
			// Re-register listeners in case component remounted
			setupSocketListeners(globalSocket, user, setIncomingCall);
			setSocket(globalSocket);
			return;
		}

		// Create new socket connection
		user.getIdToken().then((token) => {
			const newSocket = io(API_BASE_URL, {
				auth: { token },
				transports: ["websocket"],
			});

			setupSocketListeners(newSocket, user, setIncomingCall);

			globalSocket = newSocket;
			setSocket(newSocket);
		});

		return () => {
			// Don't disconnect on unmount, keep connection alive
		};
	}, [user, setIncomingCall]);

	return socket;
}

