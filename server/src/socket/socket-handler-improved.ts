/**
 * Improved Socket.io Handler
 * 
 * Supports new event structure with namespaces, acknowledgments, and rate limiting
 */

import { Server, Socket } from "socket.io";
import { adminAuth } from "../config/firebaseAdmin";

interface UserSocket extends Socket {
	userId?: string;
	roomId?: string;
}

// Rate limiting: track message counts per socket
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // max messages per window

function checkRateLimit(socketId: string): boolean {
	const now = Date.now();
	const record = rateLimitMap.get(socketId);

	if (!record || now > record.resetAt) {
		rateLimitMap.set(socketId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
		return true;
	}

	if (record.count >= RATE_LIMIT_MAX) {
		return false;
	}

	record.count++;
	return true;
}

function sendAck(socket: Socket, messageId: string, success: boolean, error?: string) {
	socket.emit("event:ack", {
		messageId,
		success,
		error,
		timestamp: Date.now(),
	});
}

export function setupSocketIO(io: Server) {
	// Middleware to authenticate socket connections
	io.use(async (socket: UserSocket, next) => {
		const token = socket.handshake.auth.token;
		if (!token) {
			return next(new Error("Authentication error"));
		}

		try {
			const decodedToken = await adminAuth.verifyIdToken(token);
			socket.userId = decodedToken.uid;
			next();
		} catch (error) {
			next(new Error("Authentication error"));
		}
	});

	io.on("connection", (socket: UserSocket) => {
		console.log(`User connected: ${socket.userId}`);

		// Cleanup on disconnect
		socket.on("disconnect", () => {
			rateLimitMap.delete(socket.id);
			
			if (socket.roomId) {
				socket.to(socket.roomId).emit("peer:left", {
					messageId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
					timestamp: Date.now(),
					version: "1.0.0",
					roomId: socket.roomId,
					userId: socket.userId || "",
					socketId: socket.id,
					type: "peer:left",
					data: {
						userId: socket.userId || "",
						socketId: socket.id,
					},
				});
				console.log(`User ${socket.userId} left room ${socket.roomId}`);
			}
			console.log(`User disconnected: ${socket.userId}`);
		});

		// Room management
		socket.on("room:join", async (event: any) => {
			if (!checkRateLimit(socket.id)) {
				sendAck(socket, event.messageId || "", false, "Rate limit exceeded");
				return;
			}

			try {
				const roomId = event.data?.roomId || event;
				socket.roomId = roomId;
				socket.join(roomId);
				console.log(`✅ User ${socket.userId} (socket: ${socket.id}) joined room ${roomId}`);

				// Get all sockets in the room
				const socketsInRoom = await io.in(roomId).fetchSockets();
				console.log(`📊 Room ${roomId} now has ${socketsInRoom.length} sockets`);

				// Send acknowledgment
				if (event.messageId) {
					sendAck(socket, event.messageId, true);
				}

				// Send room joined confirmation (legacy support)
				socket.emit("room-joined", { roomId });

				// Notify existing users about new peer
				const existingUsers = socketsInRoom
					.filter((s) => s.id !== socket.id)
					.map((s) => ({
						userId: (s as UserSocket).userId,
						socketId: s.id,
					}));

				// Notify joining user about existing peers
				existingUsers.forEach((user) => {
					socket.emit("peer:joined", {
						messageId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
						timestamp: Date.now(),
						version: "1.0.0",
						roomId,
						userId: user.userId || "",
						socketId: user.socketId,
						type: "peer:joined",
						data: {
							userId: user.userId || "",
							socketId: user.socketId,
						},
					});

					// Legacy support
					socket.emit("user-joined", {
						userId: user.userId,
						socketId: user.socketId,
					});
				});

				// Notify others about new peer
				socket.to(roomId).emit("peer:joined", {
					messageId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
					timestamp: Date.now(),
					version: "1.0.0",
					roomId,
					userId: socket.userId || "",
					socketId: socket.id,
					type: "peer:joined",
					data: {
						userId: socket.userId || "",
						socketId: socket.id,
					},
				});

				// Legacy support
				socket.to(roomId).emit("user-joined", {
					userId: socket.userId,
					socketId: socket.id,
				});
			} catch (error) {
				console.error("Error in room:join:", error);
				if (event.messageId) {
					sendAck(socket, event.messageId, false, "Failed to join room");
				}
			}
		});

		socket.on("room:leave", async (event: any) => {
			if (!checkRateLimit(socket.id)) {
				sendAck(socket, event.messageId || "", false, "Rate limit exceeded");
				return;
			}

			if (socket.roomId) {
				socket.leave(socket.roomId);
				socket.roomId = undefined;
			}

			if (event.messageId) {
				sendAck(socket, event.messageId, true);
			}
		});

		// Call control events
		socket.on("call:initiate", async (event: any) => {
			if (!checkRateLimit(socket.id)) {
				sendAck(socket, event.messageId || "", false, "Rate limit exceeded");
				return;
			}

			try {
				const { callId, roomId, callerId, callerName, callerAvatar, conversationId, callType } =
					event.data || event;

				const finalRoomId = roomId || event.roomId || socket.roomId;
				const finalCallId = callId || `${finalRoomId}-${Date.now()}`;

				// Ensure caller is in the room
				socket.join(finalRoomId);
				socket.roomId = finalRoomId;

				// Get all participants
				const socketsInRoom = await io.in(finalRoomId).fetchSockets();
				const targetSockets = socketsInRoom.filter(
					(s) => s.id !== socket.id && (s as UserSocket).userId !== callerId
				);

				// Send acknowledgment
				if (event.messageId) {
					sendAck(socket, event.messageId, true);
				}

				// Send call notification to targets
				targetSockets.forEach((targetSocket) => {
					targetSocket.emit("call:initiate", {
						...event,
						data: {
							callId: finalCallId,
							roomId: finalRoomId,
							callerId: callerId || socket.userId,
							callerName,
							callerAvatar,
							conversationId,
							callType: callType || "video",
						},
					});

					// Legacy support
					targetSocket.emit("incoming-call", {
						callId: finalCallId,
						roomId: finalRoomId,
						callerId: callerId || socket.userId,
						callerName,
						callerAvatar,
						conversationId,
						callType: callType || "video",
					});
				});

				console.log(`Call ${finalCallId} initiated by ${socket.userId} in room ${finalRoomId}`);
			} catch (error) {
				console.error("Error in call:initiate:", error);
				if (event.messageId) {
					sendAck(socket, event.messageId, false, "Failed to initiate call");
				}
			}
		});

		socket.on("call:accept", (event: any) => {
			if (!checkRateLimit(socket.id)) {
				sendAck(socket, event.messageId || "", false, "Rate limit exceeded");
				return;
			}

			const roomId = event.data?.roomId || event.roomId || socket.roomId;
			socket.to(roomId).emit("call:accept", event);

			// Legacy support
			socket.to(roomId).emit("call-accepted", {
				callId: event.data?.callId || event.callId,
				roomId,
			});

			if (event.messageId) {
				sendAck(socket, event.messageId, true);
			}
		});

		socket.on("call:decline", (event: any) => {
			if (!checkRateLimit(socket.id)) {
				sendAck(socket, event.messageId || "", false, "Rate limit exceeded");
				return;
			}

			const roomId = event.data?.roomId || event.roomId || socket.roomId;
			socket.to(roomId).emit("call:decline", {
				...event,
				data: {
					...event.data,
					declinedBy: socket.userId,
				},
			});

			// Legacy support
			socket.to(roomId).emit("call-declined", {
				callId: event.data?.callId || event.callId,
				roomId,
				declinedBy: socket.userId,
			});

			if (event.messageId) {
				sendAck(socket, event.messageId, true);
			}
		});

		socket.on("call:end", (event: any) => {
			if (!checkRateLimit(socket.id)) {
				sendAck(socket, event.messageId || "", false, "Rate limit exceeded");
				return;
			}

			const roomId = event.data?.roomId || event.roomId || socket.roomId;
			io.to(roomId).emit("call:end", event);

			// Legacy support
			io.to(roomId).emit("call-ended", {
				callId: event.data?.callId || event.callId,
				roomId,
			});

			if (event.messageId) {
				sendAck(socket, event.messageId, true);
			}
		});

		socket.on("call:cancel", (event: any) => {
			if (!checkRateLimit(socket.id)) {
				sendAck(socket, event.messageId || "", false, "Rate limit exceeded");
				return;
			}

			const roomId = event.data?.roomId || event.roomId || socket.roomId;
			socket.to(roomId).emit("call:cancel", event);

			// Legacy support
			socket.to(roomId).emit("call-cancelled", {
				callId: event.data?.callId || event.callId,
				roomId,
			});

			if (event.messageId) {
				sendAck(socket, event.messageId, true);
			}
		});

		// WebRTC signaling events
		socket.on("signal:offer", (event: any) => {
			if (!checkRateLimit(socket.id)) {
				return; // Don't send ack for signaling events to avoid loops
			}

			const targetSocketId = event.data?.targetSocketId || event.targetSocketId;
			if (targetSocketId) {
				socket.to(targetSocketId).emit("signal:offer", {
					...event,
					socketId: socket.id,
				});

				// Legacy support
				socket.to(targetSocketId).emit("offer", {
					offer: event.data?.offer || event.offer,
					socketId: socket.id,
				});
			}
		});

		socket.on("signal:answer", (event: any) => {
			if (!checkRateLimit(socket.id)) {
				return;
			}

			const targetSocketId = event.data?.targetSocketId || event.targetSocketId;
			if (targetSocketId) {
				socket.to(targetSocketId).emit("signal:answer", {
					...event,
					socketId: socket.id,
				});

				// Legacy support
				socket.to(targetSocketId).emit("answer", {
					answer: event.data?.answer || event.answer,
					socketId: socket.id,
				});
			}
		});

		socket.on("signal:ice-candidate", (event: any) => {
			if (!checkRateLimit(socket.id)) {
				return;
			}

			const targetSocketId = event.data?.targetSocketId || event.targetSocketId;
			if (targetSocketId) {
				socket.to(targetSocketId).emit("signal:ice-candidate", {
					...event,
					socketId: socket.id,
				});

				// Legacy support
				socket.to(targetSocketId).emit("ice-candidate", {
					candidate: event.data?.candidate || event.candidate,
					socketId: socket.id,
				});
			}
		});

		socket.on("signal:ice-restart", (event: any) => {
			if (!checkRateLimit(socket.id)) {
				sendAck(socket, event.messageId || "", false, "Rate limit exceeded");
				return;
			}

			const targetSocketId = event.data?.targetSocketId || event.targetSocketId;
			if (targetSocketId) {
				socket.to(targetSocketId).emit("signal:ice-restart", {
					...event,
					socketId: socket.id,
				});
			}

			if (event.messageId) {
				sendAck(socket, event.messageId, true);
			}
		});

		// Legacy event support (for backward compatibility)
		socket.on("join-room", async (roomId: string) => {
			socket.emit("room:join", { data: { roomId } });
		});

		socket.on("offer", (data: any) => {
			socket.emit("signal:offer", {
				data: {
					offer: data.offer,
					targetSocketId: data.targetSocketId,
				},
			});
		});

		socket.on("answer", (data: any) => {
			socket.emit("signal:answer", {
				data: {
					answer: data.answer,
					targetSocketId: data.targetSocketId,
				},
			});
		});

		socket.on("ice-candidate", (data: any) => {
			socket.emit("signal:ice-candidate", {
				data: {
					candidate: data.candidate,
					targetSocketId: data.targetSocketId,
				},
			});
		});

		socket.on("initiate-call", async (data: any) => {
			socket.emit("call:initiate", {
				data: {
					...data,
					callId: data.callId || `${data.roomId}-${Date.now()}`,
				},
			});
		});

		socket.on("call-accepted", (data: any) => {
			socket.emit("call:accept", { data });
		});

		socket.on("call-declined", (data: any) => {
			socket.emit("call:decline", { data });
		});

		socket.on("call-ended", (data: any) => {
			socket.emit("call:end", { data });
		});

		socket.on("call-cancelled", (data: any) => {
			socket.emit("call:cancel", { data });
		});

		socket.on("user-left", (data: any) => {
			socket.emit("peer:left", {
				data: {
					userId: data.userId,
					socketId: data.socketId,
				},
			});
		});
	});
}

