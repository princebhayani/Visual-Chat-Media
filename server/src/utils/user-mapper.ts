import { prisma } from "../config/prisma";

/**
 * Maps Firebase UID to Prisma User ID
 * @param firebaseUid - Firebase user UID
 * @returns Prisma User ID or null if user not found
 */
export async function getPrismaUserIdFromFirebaseUid(firebaseUid: string): Promise<string | null> {
	try {
		const user = await prisma.user.findUnique({
			where: { firebaseUid },
			select: { id: true },
		});
		return user?.id ?? null;
	} catch (error) {
		console.error(`Failed to map Firebase UID ${firebaseUid} to Prisma User ID:`, error);
		return null;
	}
}

/**
 * Maps multiple Firebase UIDs to Prisma User IDs
 * @param firebaseUids - Array of Firebase user UIDs
 * @returns Map of Firebase UID -> Prisma User ID (only includes found users)
 */
export async function getPrismaUserIdsFromFirebaseUids(
	firebaseUids: string[]
): Promise<Map<string, string>> {
	const userIdMap = new Map<string, string>();

	try {
		const users = await prisma.user.findMany({
			where: {
				firebaseUid: {
					in: firebaseUids,
				},
			},
			select: {
				id: true,
				firebaseUid: true,
			},
		});

		users.forEach((user) => {
			userIdMap.set(user.firebaseUid, user.id);
		});
	} catch (error) {
		console.error("Failed to map Firebase UIDs to Prisma User IDs:", error);
	}

	return userIdMap;
}

