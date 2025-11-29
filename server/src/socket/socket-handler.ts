import { Server, Socket } from "socket.io";
import { adminAuth } from "../config/firebaseAdmin";

interface UserSocket extends Socket {
	userId?: string;
	roomId?: string;
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

		socket.on("join-room", async (roomId: string) => {
			socket.roomId = roomId;
			socket.join(roomId);
			console.log(`✅ User ${socket.userId} (socket: ${socket.id}) joined room ${roomId}`);

			// Get all sockets in the room after joining
			const socketsInRoom = await io.in(roomId).fetchSockets();
			console.log(`📊 Room ${roomId} now has ${socketsInRoom.length} sockets`);
			socketsInRoom.forEach((s) => {
				console.log(`   - User: ${(s as UserSocket).userId}, Socket: ${s.id}`);
			});
			
			// Confirm room join to client
			socket.emit("room-joined", { roomId });
			
			const existingUsers = socketsInRoom
				.filter((s) => s.id !== socket.id)
				.map((s) => ({
					userId: (s as UserSocket).userId,
					socketId: s.id,
				}));

			// Notify the joining user about existing users (for video calls)
			existingUsers.forEach((user) => {
				socket.emit("user-joined", {
					userId: user.userId,
					socketId: user.socketId,
				});
			});

			// Notify others in the room about the new user (for video calls)
			socket.to(roomId).emit("user-joined", {
				userId: socket.userId,
				socketId: socket.id,
			});
		});

		socket.on("offer", (data: { offer: RTCSessionDescriptionInit; targetSocketId: string; roomId: string }) => {
			socket.to(data.targetSocketId).emit("offer", {
				offer: data.offer,
				socketId: socket.id,
			});
		});

		socket.on("answer", (data: { answer: RTCSessionDescriptionInit; targetSocketId: string }) => {
			socket.to(data.targetSocketId).emit("answer", {
				answer: data.answer,
				socketId: socket.id,
			});
		});

		socket.on("ice-candidate", (data: { candidate: RTCIceCandidateInit; targetSocketId: string }) => {
			socket.to(data.targetSocketId).emit("ice-candidate", {
				candidate: data.candidate,
				socketId: socket.id,
			});
		});

		socket.on("initiate-call", async (data: {
			roomId: string;
			callerId: string;
			callerName?: string;
			callerAvatar?: string;
			conversationId?: string;
			callId?: string;
			callType?: "video" | "audio";
		}) => {
			const callId = data.callId || `${data.roomId}-${Date.now()}`;
			
			// Ensure caller is in the room
			socket.join(data.roomId);
			console.log(`Caller ${socket.userId} joined room ${data.roomId} for call ${callId}`);
			
			// Get all participants in the conversation/room
			const socketsInRoom = await io.in(data.roomId).fetchSockets();
			console.log(`Room ${data.roomId} has ${socketsInRoom.length} sockets total`);
			socketsInRoom.forEach((s) => {
				console.log(`  - Socket: ${s.id}, User: ${(s as UserSocket).userId}`);
			});
			
			// Filter out the caller by both socket.id and userId to prevent self-notification
			const targetSockets = socketsInRoom.filter(
				(s) => s.id !== socket.id && (s as UserSocket).userId !== data.callerId
			);

			console.log(`Found ${targetSockets.length} target sockets (excluding caller)`);
			targetSockets.forEach((s) => {
				console.log(`  - Target: ${(s as UserSocket).userId} (socket: ${s.id})`);
			});

			if (targetSockets.length === 0) {
				console.warn(`No target sockets found for call ${callId} in room ${data.roomId}`);
				console.warn(`This might mean the other user hasn't joined the room yet or isn't connected`);
			}

			// Send call notification to all participants except the caller
			targetSockets.forEach((targetSocket) => {
				const notificationData = {
					callId,
					roomId: data.roomId,
					callerId: data.callerId,
					callerName: data.callerName,
					callerAvatar: data.callerAvatar,
					conversationId: data.conversationId,
					callType: data.callType || "video",
				};
				targetSocket.emit("incoming-call", notificationData);
				console.log(`✓ Sent call notification to ${(targetSocket as UserSocket).userId}`, notificationData);
			});

			console.log(`Call initiated by ${socket.userId} in room ${data.roomId}, notifying ${targetSockets.length} participants`);
		});

		socket.on("call-accepted", (data: { callId: string; roomId: string }) => {
			// Notify the caller that the call was accepted
			socket.to(data.roomId).emit("call-accepted", {
				callId: data.callId,
				roomId: data.roomId,
			});
			console.log(`Call ${data.callId} accepted`);
		});

		socket.on("call-declined", (data: { callId: string; roomId: string }) => {
			// Notify the caller that the call was declined
			// Include the user who declined for better UX
			socket.to(data.roomId).emit("call-declined", {
				callId: data.callId,
				roomId: data.roomId,
				declinedBy: socket.userId,
			});
			console.log(`Call ${data.callId} declined by ${socket.userId}`);
		});

		socket.on("call-cancelled", (data: { callId: string; roomId: string }) => {
			// Notify participants that the call was cancelled
			socket.to(data.roomId).emit("call-cancelled", {
				callId: data.callId,
				roomId: data.roomId,
			});
			console.log(`Call ${data.callId} cancelled`);
		});

		socket.on("call-ended", (data: { callId: string; roomId: string }) => {
			// Notify all participants that the call has ended (caller hung up)
			io.to(data.roomId).emit("call-ended", {
				callId: data.callId,
				roomId: data.roomId,
			});
			console.log(`Call ${data.callId} ended by caller`);
		});

		socket.on("disconnect", () => {
			if (socket.roomId) {
				socket.to(socket.roomId).emit("user-left", {
					userId: socket.userId,
					socketId: socket.id,
				});
				console.log(`User ${socket.userId} left room ${socket.roomId}`);
			}
			console.log(`User disconnected: ${socket.userId}`);
		});
	});
}

