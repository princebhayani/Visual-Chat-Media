import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/authenticate";

const router = Router();

function conversationInclude() {
	return {
		participants: {
			include: {
				user: true,
			},
		},
		messages: {
			orderBy: { createdAt: "desc" },
			take: 1,
			include: {
				sender: true,
			},
		},
	};
}

router.get("/", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const me = await prisma.user.findUnique({
		where: { firebaseUid: req.user.uid },
	});

	if (!me) {
		return res.json([]);
	}

	const conversations = await prisma.conversation.findMany({
		where: {
			participants: {
				some: {
					userId: me.id,
				},
			},
		},
		orderBy: { updatedAt: "desc" },
		include: conversationInclude(),
	});

	res.json(
		conversations.map((conversation) => ({
			...conversation,
			lastMessage: conversation.messages[0] ?? null,
		}))
	);
});

const createConversationBody = z.object({
	participantIds: z.array(z.string().uuid()).min(1),
	isGroup: z.boolean(),
	groupName: z.string().min(2).max(120).optional(),
	groupImageUrl: z.string().url().optional(),
});

router.post("/", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const body = createConversationBody.parse(req.body);
		const me = await prisma.user.findUniqueOrThrow({
			where: { firebaseUid: req.user.uid },
		});

		const uniqueParticipantIds = Array.from(new Set([...body.participantIds, me.id]));

		if (body.isGroup && uniqueParticipantIds.length < 3) {
			return res.status(400).json({ message: "Groups need at least 3 participants." });
		}

		if (!body.isGroup && uniqueParticipantIds.length !== 2) {
			return res.status(400).json({ message: "Direct conversations require exactly 1 additional person." });
		}

		// For direct conversations, check if a conversation already exists between these two users
		if (!body.isGroup) {
			// Find conversations where the current user is a participant and it's not a group
			const myConversations = await prisma.conversation.findMany({
				where: {
					isGroup: false,
					participants: {
						some: {
							userId: me.id,
						},
					},
				},
				include: {
					participants: true,
				},
			});

			// Check if any of these conversations has exactly the two participants we're looking for
			for (const conv of myConversations) {
				const participantUserIds = conv.participants.map((p) => p.userId);
				if (participantUserIds.length === 2) {
					const sortedExisting = [...participantUserIds].sort();
					const sortedRequested = [...uniqueParticipantIds].sort();

					if (sortedExisting.every((id, idx) => id === sortedRequested[idx])) {
						// Found existing conversation, return it with full details
						const fullConversation = await prisma.conversation.findUnique({
							where: { id: conv.id },
							include: conversationInclude(),
						});

						if (fullConversation) {
							return res.json({
								...fullConversation,
								lastMessage: fullConversation.messages[0] ?? null,
							});
						}
					}
				}
			}
		}

		const conversation = await prisma.conversation.create({
			data: {
				isGroup: body.isGroup,
				groupName: body.isGroup ? body.groupName : null,
				groupImageUrl: body.isGroup ? body.groupImageUrl : null,
				adminId: body.isGroup ? me.id : null,
				participants: {
					createMany: {
						data: uniqueParticipantIds.map((userId) => ({
							userId,
						})),
						skipDuplicates: true,
					},
				},
			},
			include: conversationInclude(),
		});

		res.json({
			...conversation,
			lastMessage: conversation.messages[0] ?? null,
		});
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: error.issues[0].message });
		}
		console.error("Failed to create conversation", error);
		return res.status(500).json({ message: "Unable to create conversation" });
	}
});

const kickBody = z.object({
	userId: z.string().uuid(),
});

router.post("/:conversationId/kick", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const params = z.object({ conversationId: z.string().uuid() }).parse(req.params);
		const { userId } = kickBody.parse(req.body);

		const me = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: req.user.uid } });
		const conversation = await prisma.conversation.findUnique({
			where: { id: params.conversationId },
		});

		if (!conversation || conversation.adminId !== me.id) {
			return res.status(403).json({ message: "Only the group admin can remove participants." });
		}

		await prisma.conversationParticipant.deleteMany({
			where: {
				conversationId: params.conversationId,
				userId,
			},
		});

		res.json({ success: true });
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: error.issues[0].message });
		}
		console.error("Failed to kick user", error);
		return res.status(500).json({ message: "Unable to kick user" });
	}
});

export default router;

