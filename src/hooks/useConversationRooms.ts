"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "./useSocket";
import { useAuthedSWR } from "./useAuthedSWR";

export function useConversationRooms() {
	const socket = useSocket();
	const { data: conversations, mutate: mutateConversations, error, isLoading } = useAuthedSWR<any[]>("/conversations");
	const joinedRoomsRef = useRef<Set<string>>(new Set());
	const conversationsRef = useRef<any[]>([]);

	// Keep conversations ref updated
	useEffect(() => {
		if (conversations) {
			console.log(`📚 Conversations loaded: ${conversations.length} conversations`);
			conversationsRef.current = conversations;
		}
	}, [conversations]);

	// Log errors
	useEffect(() => {
		if (error) {
			console.error("❌ Error loading conversations:", error);
		}
	}, [error]);

	// Log loading state
	useEffect(() => {
		if (isLoading) {
			console.log("⏳ Loading conversations...");
		}
	}, [isLoading]);

	const joinAllRooms = (force = false, conversationsToJoin?: any[]) => {
		if (!socket || !socket.connected) {
			console.log("⚠️ Cannot join rooms: socket not connected");
			return false;
		}

		// Use provided conversations or fall back to ref
		const convs = conversationsToJoin || conversationsRef.current || conversations;
		if (!convs || convs.length === 0) {
			console.log("⚠️ Cannot join rooms: no conversations loaded yet");
			return false;
		}

		let joinedCount = 0;
		console.log(`📋 Joining ${convs.length} conversation rooms for notifications`);

		// Join all conversation rooms for notifications
		// This ensures users receive call notifications regardless of which conversation is currently open
		convs.forEach((conversation) => {
			if (!conversation || !conversation.id) {
				console.warn("⚠️ Invalid conversation object:", conversation);
				return;
			}
			
			if (force || !joinedRoomsRef.current.has(conversation.id)) {
				console.log(`📥 Joining conversation room: ${conversation.id}`);
				socket.emit("join-room", conversation.id);
				joinedRoomsRef.current.add(conversation.id);
				joinedCount++;
			} else {
				console.log(`⏭️ Already joined room: ${conversation.id}`);
			}
		});

		console.log(`✅ Joined ${joinedCount} new rooms (total: ${joinedRoomsRef.current.size})`);
		return true;
	};

	useEffect(() => {
		if (!socket || !socket.connected) return;

		// Listen for room join confirmation
		const handleRoomJoined = (data: { roomId: string }) => {
			console.log(`✅ Confirmed: Joined room ${data.roomId}`);
		};

		// Listen for socket ready event (on connect/reconnect)
		const handleSocketReady = () => {
			console.log("🔄 Socket ready, rejoining all rooms");
			// Small delay to ensure socket is fully ready
			setTimeout(() => {
				joinAllRooms(false, conversations || conversationsRef.current);
			}, 200);
		};

		socket.on("room-joined", handleRoomJoined);
		socket.on("socket-ready-for-rooms", handleSocketReady);

		// Join rooms immediately when socket connects
		joinAllRooms(false, conversations);

		return () => {
			socket.off("room-joined", handleRoomJoined);
			socket.off("socket-ready-for-rooms", handleSocketReady);
		};
	}, [socket, socket?.connected, conversations]);

	// Join rooms when conversations load or change
	useEffect(() => {
		if (socket && socket.connected && conversations && conversations.length > 0) {
			console.log("🔄 Conversations loaded/changed, joining rooms");
			joinAllRooms(false, conversations);
		}
	}, [socket, socket?.connected, conversations]);

	// Retry joining rooms if socket connects but conversations aren't loaded yet
	useEffect(() => {
		if (socket && socket.connected && (!conversations || conversations.length === 0)) {
			console.log("⏳ Socket connected but conversations not loaded, will retry...");
			
			// Multiple retry attempts
			const retries = [500, 1000, 2000, 3000];
			const timers = retries.map((delay) => {
				return setTimeout(() => {
					const currentConvs = conversationsRef.current.length > 0 
						? conversationsRef.current 
						: conversations;
					
					if (currentConvs && currentConvs.length > 0) {
						console.log(`🔄 Retry ${delay}ms: Joining rooms`);
						joinAllRooms(true, currentConvs);
					} else if (mutateConversations) {
						console.log(`🔄 Retry ${delay}ms: Refetching conversations`);
						mutateConversations();
					}
				}, delay);
			});

			return () => {
				timers.forEach(clearTimeout);
			};
		}
	}, [socket, socket?.connected, conversations, mutateConversations]);

	// Reset joined rooms when socket disconnects
	useEffect(() => {
		if (!socket || !socket.connected) {
			console.log("🔄 Socket disconnected, clearing joined rooms");
			joinedRoomsRef.current.clear();
		}
	}, [socket, socket?.connected]);

	// Periodic health check to ensure rooms are still joined
	useEffect(() => {
		if (!socket || !socket.connected) return;

		const healthCheckInterval = setInterval(() => {
			const convs = conversationsRef.current || conversations;
			if (convs && convs.length > 0 && socket.connected) {
				// Check if we need to rejoin any rooms
				const expectedRooms = new Set(convs.map((c: any) => c.id));
				const missingRooms = Array.from(expectedRooms).filter(
					(roomId) => !joinedRoomsRef.current.has(roomId)
				);

				if (missingRooms.length > 0) {
					console.log(`🔍 Health check: Missing ${missingRooms.length} rooms, rejoining...`);
					missingRooms.forEach((roomId) => {
						console.log(`📥 Rejoining room: ${roomId}`);
						socket.emit("join-room", roomId);
						joinedRoomsRef.current.add(roomId);
					});
				}
			}
		}, 10000); // Check every 10 seconds

		return () => clearInterval(healthCheckInterval);
	}, [socket, socket?.connected, conversations]);
}

