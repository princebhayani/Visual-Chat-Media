"use client";

import useSWR from "swr";
import type { SWRConfiguration } from "swr";
import { authedFetch } from "@/lib/api-client";
import { useFirebaseAuthContext } from "@/providers/firebase-auth-provider";

export function useAuthedSWR<T>(path: string | null, config?: SWRConfiguration<T>) {
	const { user, isLoading } = useFirebaseAuthContext();

	const fetcher = () => authedFetch<T>(path!);

	return useSWR<T>(!isLoading && user && path ? path : null, fetcher, {
		revalidateOnFocus: true,
		...config,
	});
}

