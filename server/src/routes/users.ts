import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/authenticate";

const router = Router();

const syncBody = z.object({
	name: z.string().min(1).max(120).optional(),
	avatarUrl: z.string().url().optional(),
});

router.post("/sync", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid || !req.user.email) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const payload = syncBody.parse(req.body ?? {});
		const normalizedEmail = req.user.email.toLowerCase();

		// Try to find user by firebaseUid first
		let user = await prisma.user.findUnique({
			where: { firebaseUid: req.user.uid },
		});

		if (user) {
			// Update existing user
			user = await prisma.user.update({
				where: { firebaseUid: req.user.uid },
				data: {
					name: payload.name ?? req.user.name ?? undefined,
					avatarUrl: payload.avatarUrl ?? req.user.picture ?? undefined,
					isOnline: true,
				},
			});
		} else {
			// Check if user exists by email (different firebaseUid)
			const existingByEmail = await prisma.user.findUnique({
				where: { email: normalizedEmail },
			});

			if (existingByEmail) {
				// Update firebaseUid to match current auth
				user = await prisma.user.update({
					where: { email: normalizedEmail },
					data: {
						firebaseUid: req.user.uid,
						name: payload.name ?? req.user.name ?? existingByEmail.name,
						avatarUrl: payload.avatarUrl ?? req.user.picture ?? existingByEmail.avatarUrl,
						isOnline: true,
					},
				});
			} else {
				// Create new user
				user = await prisma.user.create({
					data: {
						firebaseUid: req.user.uid,
						email: normalizedEmail,
						name: payload.name ?? req.user.name,
						avatarUrl: payload.avatarUrl ?? req.user.picture,
						isOnline: true,
					},
				});
			}
		}

		res.json(user);
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: error.issues[0].message });
		}
		console.error("Failed to sync user", error);
		return res.status(500).json({ message: "Unable to sync user" });
	}
});

const statusBody = z.object({
	isOnline: z.boolean(),
});

router.post("/status", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const { isOnline } = statusBody.parse(req.body);

		const user = await prisma.user.update({
			where: { firebaseUid: req.user.uid },
			data: { isOnline },
		});

		res.json(user);
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: error.issues[0].message });
		}
		console.error("Unable to update status", error);
		return res.status(500).json({ message: "Unable to update status" });
	}
});

router.get("/me", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const user = await prisma.user.findUnique({
		where: { firebaseUid: req.user.uid },
	});

	res.json(user);
});

router.get("/", async (req: AuthenticatedRequest, res) => {
	if (!req.user?.uid) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const currentUser = await prisma.user.findUnique({
		where: { firebaseUid: req.user.uid },
	});

	const users = await prisma.user.findMany({
		where: {
			id: {
				not: currentUser?.id,
			},
		},
		orderBy: {
			name: "asc",
		},
	});

	res.json(users);
});

export default router;

