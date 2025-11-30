import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/authenticate";

const router = Router();

/**
 * Get call history for a conversation
 * GET /calls/:conversationId
 */
router.get("/:conversationId", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const params = z.object({ conversationId: z.string().uuid() }).parse(req.params);
		const me = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: req.user.uid } });

		// Verify user is a participant in the conversation
		const isParticipant = await prisma.conversationParticipant.findFirst({
			where: {
				conversationId: params.conversationId,
				userId: me.id,
			},
		});

		if (!isParticipant) {
			return res.status(403).json({ message: "You are not part of this conversation." });
		}

		// Get all call rooms for this conversation
		const callRooms = await prisma.callRoom.findMany({
			where: {
				conversationId: params.conversationId,
			},
			include: {
				participants: {
					include: {
						user: {
							select: {
								id: true,
								firebaseUid: true,
								name: true,
								avatarUrl: true,
								email: true,
							},
						},
					},
				},
				creator: {
					select: {
						id: true,
						firebaseUid: true,
						name: true,
						avatarUrl: true,
						email: true,
					},
				},
			},
			orderBy: {
				startedAt: "desc",
			},
		});

		res.json(callRooms);
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: error.issues[0].message });
		}
		console.error("Failed to fetch call history", error);
		return res.status(500).json({ message: "Unable to fetch call history" });
	}
});

/**
 * Get call history for the current user across all conversations
 * GET /calls
 */
router.get("/", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const me = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: req.user.uid } });

		// Get all call rooms where the user is a participant
		const callRooms = await prisma.callRoom.findMany({
			where: {
				participants: {
					some: {
						userId: me.id,
					},
				},
			},
			include: {
				participants: {
					include: {
						user: {
							select: {
								id: true,
								firebaseUid: true,
								name: true,
								avatarUrl: true,
								email: true,
							},
						},
					},
				},
				creator: {
					select: {
						id: true,
						firebaseUid: true,
						name: true,
						avatarUrl: true,
						email: true,
					},
				},
				conversation: {
					select: {
						id: true,
						isGroup: true,
						groupName: true,
						groupImageUrl: true,
					},
				},
			},
			orderBy: {
				startedAt: "desc",
			},
		});

		res.json(callRooms);
	} catch (error: any) {
		console.error("Failed to fetch user call history", error);
		return res.status(500).json({ message: "Unable to fetch call history" });
	}
});

/**
 * Get a specific call room by ID
 * GET /calls/details/:callId
 */
router.get("/details/:callId", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const params = z.object({ callId: z.string() }).parse(req.params);
		const me = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: req.user.uid } });

		// Get call room and verify user is a participant
		const callRoom = await prisma.callRoom.findUnique({
			where: { id: params.callId },
			include: {
				participants: {
					include: {
						user: {
							select: {
								id: true,
								firebaseUid: true,
								name: true,
								avatarUrl: true,
								email: true,
							},
						},
					},
				},
				creator: {
					select: {
						id: true,
						firebaseUid: true,
						name: true,
						avatarUrl: true,
						email: true,
					},
				},
				conversation: {
					select: {
						id: true,
						isGroup: true,
						groupName: true,
						groupImageUrl: true,
					},
				},
			},
		});

		if (!callRoom) {
			return res.status(404).json({ message: "Call room not found" });
		}

		// Verify user is a participant
		const isParticipant = callRoom.participants.some((p) => p.userId === me.id);
		if (!isParticipant) {
			return res.status(403).json({ message: "You are not a participant in this call" });
		}

		res.json(callRoom);
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: error.issues[0].message });
		}
		console.error("Failed to fetch call details", error);
		return res.status(500).json({ message: "Unable to fetch call details" });
	}
});

export default router;

