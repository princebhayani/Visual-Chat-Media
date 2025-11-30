/**
 * Legacy video-call-room component
 * 
 * NOTE: This file is kept for backward compatibility during deployment.
 * The main component is now VideoCallRoomEnhanced.tsx
 * 
 * This file redirects to the enhanced component to avoid TypeScript errors.
 */

"use client";

import dynamic from "next/dynamic";

// Redirect to enhanced component - this ensures no TypeScript errors
// and maintains backward compatibility
const DynamicVideoCallRoom = dynamic(
	() => import("@/components/video-call/VideoCallRoomEnhanced"),
	{ ssr: false }
);

export default function VideoCallRoom() {
	return <DynamicVideoCallRoom />;
}
