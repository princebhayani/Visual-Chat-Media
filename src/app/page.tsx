"use client";

import { Loader2 } from "lucide-react";

import LeftPanel from "@/components/home/left-panel";
import RightPanel from "@/components/home/right-panel";
import AuthOptions from "@/components/auth/auth-options";
import AuthInitializer from "@/components/auth/auth-initializer";
import CallNotification from "@/components/video-call/call-notification";
import { useFirebaseAuthContext } from "@/providers/firebase-auth-provider";
import { useSocket } from "@/hooks/useSocket";
import { useConversationRooms } from "@/hooks/useConversationRooms";

export default function Home() {
	const { user, isLoading } = useFirebaseAuthContext();
	// Initialize socket connection for call notifications
	useSocket();
	// Join conversation rooms for call notifications
	useConversationRooms();

	if (isLoading) {
		return (
			<div className='flex min-h-screen flex-col items-center justify-center gap-3 bg-left-panel text-gray-300'>
				<Loader2 className='h-6 w-6 animate-spin' />
				<p className='text-sm'>Checking your session...</p>
			</div>
		);
	}

	if (!user) {
		return <AuthOptions />;
	}

	return (
		<main className='m-5'>
			<AuthInitializer />
			<div className='flex h-[calc(100vh-50px)] max-w-[1700px] overflow-y-hidden bg-left-panel mx-auto'>
				<div className='fixed top-0 left-0 -z-30 h-36 w-full bg-green-primary dark:bg-transparent' />
				<LeftPanel />
				<RightPanel />
			</div>
			<CallNotification />
		</main>
	);
}