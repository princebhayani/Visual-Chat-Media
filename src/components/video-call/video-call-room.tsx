/**
 * Legacy video-call-room component
 * 
 * NOTE: This file is kept for backward compatibility during deployment.
 * The main component is now VideoCallRoomEnhanced.tsx
 * 
 * This file fixes TypeScript errors and redirects to the enhanced component.
 */

"use client";

import dynamic from "next/dynamic";

// Redirect to enhanced component
const DynamicVideoCallRoom = dynamic(
	() => import("@/components/video-call/VideoCallRoomEnhanced"),
	{ ssr: false }
);

export default function VideoCallRoom() {
	return <DynamicVideoCallRoom />;
}

