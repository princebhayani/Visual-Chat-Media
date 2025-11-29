import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "../config/firebaseAdmin";

export interface AuthenticatedRequest extends Request {
	user?: {
		uid: string;
		email?: string;
		name?: string;
		picture?: string;
	};
}

export const authenticateFirebase = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "Missing Authorization header" });
	}

	try {
		const token = authHeader.split(" ")[1];
		const decoded = await adminAuth.verifyIdToken(token);

		req.user = {
			uid: decoded.uid,
			email: decoded.email,
			name: decoded.name,
			picture: decoded.picture,
		};

		return next();
	} catch (error) {
		console.error("Failed to verify Firebase token", error);
		return res.status(401).json({ message: "Invalid or expired token" });
	}
};

