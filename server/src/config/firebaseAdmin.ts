import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
	throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable.");
}

function parseServiceAccount(): Record<string, unknown> {
	try {
		const decoded = Buffer.from(serviceAccountKey, "base64").toString("utf-8");
		return JSON.parse(decoded);
	} catch (error) {
		throw new Error("Unable to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is base64 encoded JSON.");
	}
}

const app =
	getApps()[0] ??
	initializeApp({
		credential: cert(parseServiceAccount() as any),
	});

export const adminAuth = getAuth(app);

