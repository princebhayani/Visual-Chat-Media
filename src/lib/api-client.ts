"use client";

import { auth } from "@/lib/firebase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
	throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined.");
}

export async function authedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
	const currentUser = auth.currentUser;

	if (!currentUser) {
		throw new Error("Not authenticated");
	}

	const token = await currentUser.getIdToken();
	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
			...(options.headers ?? {}),
		},
	});

	if (!response.ok) {
		const error = await safeParseError(response);
		throw new Error(error ?? "Request failed");
	}

	return (await response.json()) as T;
}

async function safeParseError(response: Response) {
	try {
		const body = await response.json();
		return body.message;
	} catch {
		return response.statusText;
	}
}

