import { Server, Socket } from "socket.io";
import { adminAuth } from "../config/firebaseAdmin";
import { prisma } from "../config/prisma";
import { getPrismaUserIdFromFirebaseUid } from "../utils/user-mapper";

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
			
			// Map Firebase UID to Prisma User ID
			const callerPrismaUserId = await getPrismaUserIdFromFirebaseUid(data.callerId);
			if (!callerPrismaUserId) {
				console.error(`Failed to find Prisma User ID for Firebase UID: ${data.callerId}`);
			}

			// Create CallRoom record in database
			if (callerPrismaUserId && data.conversationId) {
				try {
					const callRoom = await prisma.callRoom.create({
						data: {
							id: callId,
							conversationId: data.conversationId,
							callType: (data.callType || "video").toUpperCase() as "VIDEO" | "AUDIO",
							status: "ACTIVE",
							createdById: callerPrismaUserId,
							participants: {
								create: {
									userId: callerPrismaUserId,
									isAudioEnabled: true,
									isVideoEnabled: data.callType === "video",
								},
							},
						},
						include: {
							participants: true,
						},
					});
					console.log(`✓ Created CallRoom record: ${callRoom.id}`);
				} catch (error: any) {
					// If call room already exists (e.g., retry), try to find and update it
					if (error.code === "P2002") {
						console.log(`CallRoom ${callId} already exists, skipping creation`);
					} else {
						console.error(`Failed to create CallRoom record:`, error);
					}
				}
			}
			
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

		socket.on("call-accepted", async (data: { callId: string; roomId: string }) => {
			// Notify the caller that the call was accepted
			socket.to(data.roomId).emit("call-accepted", {
				callId: data.callId,
				roomId: data.roomId,
			});

			// Add CallParticipant record for the user who accepted
			if (socket.userId) {
				const userPrismaId = await getPrismaUserIdFromFirebaseUid(socket.userId);
				if (userPrismaId) {
					try {
						// Check if participant already exists
						const existingParticipant = await prisma.callParticipant.findFirst({
							where: {
								callRoomId: data.callId,
								userId: userPrismaId,
							},
						});

						if (existingParticipant) {
							// Update existing participant - mark as active
							await prisma.callParticipant.update({
								where: {
									id: existingParticipant.id,
								},
								data: {
									leftAt: null,
								},
							});
						} else {
							// Create new participant
							await prisma.callParticipant.create({
								data: {
									callRoomId: data.callId,
									userId: userPrismaId,
									isAudioEnabled: true,
									isVideoEnabled: true,
								},
							});
						}
						console.log(`✓ Added/Updated CallParticipant for user ${socket.userId} to call ${data.callId}`);
					} catch (error) {
						console.error(`Failed to add CallParticipant for call ${data.callId}:`, error);
					}
				}
			}

			console.log(`Call ${data.callId} accepted`);
		});

		socket.on("call-declined", async (data: { callId: string; roomId: string }) => {
			// Notify the caller that the call was declined
			// Include the user who declined for better UX
			socket.to(data.roomId).emit("call-declined", {
				callId: data.callId,
				roomId: data.roomId,
				declinedBy: socket.userId,
			});

			// Check if there are any active participants left, if not, cancel the call
			try {
				const callRoom = await prisma.callRoom.findUnique({
					where: { id: data.callId },
					include: {
						participants: {
							where: {
								leftAt: null,
							},
						},
					},
				});

				if (callRoom && callRoom.participants.length === 0) {
					await prisma.callRoom.update({
						where: { id: data.callId },
						data: {
							status: "CANCELLED",
							endedAt: new Date(),
						},
					});
					console.log(`Call ${data.callId} cancelled (no participants after decline)`);
				}
			} catch (error) {
				console.error(`Failed to update call status for ${data.callId}:`, error);
			}

			console.log(`Call ${data.callId} declined by ${socket.userId}`);
		});

		socket.on("call-cancelled", async (data: { callId: string; roomId: string }) => {
			// Notify participants that the call was cancelled
			socket.to(data.roomId).emit("call-cancelled", {
				callId: data.callId,
				roomId: data.roomId,
			});

			// Update CallRoom status to CANCELLED
			try {
				await prisma.callRoom.update({
					where: { id: data.callId },
					data: {
						status: "CANCELLED",
						endedAt: new Date(),
					},
				});
				console.log(`✓ Updated CallRoom ${data.callId} status to CANCELLED`);
			} catch (error) {
				console.error(`Failed to update CallRoom ${data.callId} status:`, error);
			}

			console.log(`Call ${data.callId} cancelled`);
		});

		socket.on("call-ended", async (data: { callId: string; roomId: string }) => {
			// Notify all participants that the call has ended (caller hung up)
			io.to(data.roomId).emit("call-ended", {
				callId: data.callId,
				roomId: data.roomId,
			});

			// Update CallRoom status to ENDED and mark all participants as left
			try {
				const callRoom = await prisma.callRoom.findUnique({
					where: { id: data.callId },
					include: {
						participants: {
							where: {
								leftAt: null,
							},
						},
					},
				});

				if (callRoom) {
					// Update call room status
					await prisma.callRoom.update({
						where: { id: data.callId },
						data: {
							status: "ENDED",
							endedAt: new Date(),
						},
					});

					// Mark all active participants as left
					if (callRoom.participants.length > 0) {
						await prisma.callParticipant.updateMany({
							where: {
								callRoomId: data.callId,
								leftAt: null,
							},
							data: {
								leftAt: new Date(),
							},
						});
					}

					console.log(`✓ Updated CallRoom ${data.callId} status to ENDED and marked ${callRoom.participants.length} participants as left`);
				}
			} catch (error) {
				console.error(`Failed to update CallRoom ${data.callId} status:`, error);
			}

			console.log(`Call ${data.callId} ended by caller`);
		});

		socket.on("disconnect", async () => {
			if (socket.roomId) {
				socket.to(socket.roomId).emit("user-left", {
					userId: socket.userId,
					socketId: socket.id,
				});

				// Mark participant as left if they were in a call
				if (socket.userId) {
					try {
						const userPrismaId = await getPrismaUserIdFromFirebaseUid(socket.userId);
						if (userPrismaId) {
							// Find active call rooms for this user in this room (conversation)
							const activeCallRooms = await prisma.callRoom.findMany({
								where: {
									conversationId: socket.roomId,
									status: "ACTIVE",
									participants: {
										some: {
											userId: userPrismaId,
											leftAt: null,
										},
									},
								},
							});

							// Mark user as left in all active call rooms
							for (const callRoom of activeCallRooms) {
								await prisma.callParticipant.updateMany({
									where: {
										callRoomId: callRoom.id,
										userId: userPrismaId,
										leftAt: null,
									},
									data: {
										leftAt: new Date(),
									},
								});

								// Check if call room should be ended (no active participants)
								const remainingParticipants = await prisma.callParticipant.count({
									where: {
										callRoomId: callRoom.id,
										leftAt: null,
									},
								});

								if (remainingParticipants === 0) {
									await prisma.callRoom.update({
										where: { id: callRoom.id },
										data: {
											status: "ENDED",
											endedAt: new Date(),
										},
									});
									console.log(`✓ Auto-ended CallRoom ${callRoom.id} (no active participants)`);
								}
							}
						}
					} catch (error) {
						console.error(`Failed to update call participant status on disconnect:`, error);
					}
				}

				console.log(`User ${socket.userId} left room ${socket.roomId}`);
			}
			console.log(`User disconnected: ${socket.userId}`);
		});
	});
}

