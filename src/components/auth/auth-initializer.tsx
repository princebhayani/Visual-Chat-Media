"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api-client";
import { useFirebaseAuthContext } from "@/providers/firebase-auth-provider";

const AuthInitializer = () => {
	const { user, isLoading } = useFirebaseAuthContext();
	const [hasSyncedProfile, setHasSyncedProfile] = useState(false);

	useEffect(() => {
		if (isLoading || !user) {
			setHasSyncedProfile(false);
			return;
		}

		let isCancelled = false;

		(async () => {
			try {
				await authedFetch("/users/sync", {
					method: "POST",
					body: JSON.stringify({
						name: user.displayName ?? undefined,
						avatarUrl: user.photoURL ?? undefined,
					}),
				});

				if (!isCancelled) {
					setHasSyncedProfile(true);
				}
			} catch (error) {
				console.error("Failed to sync user with backend", error);
			}
		})();

		return () => {
			isCancelled = true;
		};
	}, [user, isLoading]);

	useEffect(() => {
		if (!user || !hasSyncedProfile) {
			return;
		}

		const markOnline = async () => {
			try {
				await authedFetch("/users/status", {
					method: "POST",
					body: JSON.stringify({ isOnline: true }),
				});
			} catch (error) {
				console.error("Unable to set user online", error);
			}
		};

		const markOffline = async () => {
			try {
				await authedFetch("/users/status", {
					method: "POST",
					body: JSON.stringify({ isOnline: false }),
				});
			} catch {
				// best effort
			}
		};

		markOnline();
		window.addEventListener("beforeunload", markOffline);

		return () => {
			window.removeEventListener("beforeunload", markOffline);
			markOffline();
		};
	}, [user, hasSyncedProfile]);

	return null;
};

export default AuthInitializer;

