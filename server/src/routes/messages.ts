import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/authenticate";

const router = Router();

router.get("/:conversationId", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const params = z.object({ conversationId: z.string().uuid() }).parse(req.params);
		const me = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: req.user.uid } });

		const isParticipant = await prisma.conversationParticipant.findFirst({
			where: {
				conversationId: params.conversationId,
				userId: me.id,
			},
		});

		if (!isParticipant) {
			return res.status(403).json({ message: "You are not part of this conversation." });
		}

		const messages = await prisma.message.findMany({
			where: { conversationId: params.conversationId },
			orderBy: { createdAt: "asc" },
			include: { sender: true },
		});

		res.json(messages);
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: error.issues[0].message });
		}
		console.error("Failed to fetch messages", error);
		return res.status(500).json({ message: "Unable to fetch messages" });
	}
});

const createBody = z.object({
	conversationId: z.string().uuid(),
	content: z.string().min(1),
	messageType: z.enum(["text", "image", "video"]).default("text"),
});

router.post("/", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const { conversationId, content, messageType } = createBody.parse(req.body);
		const me = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: req.user.uid } });

		const participant = await prisma.conversationParticipant.findFirst({
			where: {
				conversationId,
				userId: me.id,
			},
		});

		if (!participant) {
			return res.status(403).json({ message: "You are not part of this conversation." });
		}

		const message = await prisma.message.create({
			data: {
				conversationId,
				content,
				messageType: messageType.toUpperCase() as any,
				senderId: me.id,
			},
			include: {
				sender: true,
			},
		});

		await prisma.conversation.update({
			where: { id: conversationId },
			data: { updatedAt: new Date(), lastMessageAt: new Date() },
		});

		res.json(message);
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: error.issues[0].message });
		}
		console.error("Failed to create message", error);
		return res.status(500).json({ message: "Unable to send message" });
	}
});

export default router;

