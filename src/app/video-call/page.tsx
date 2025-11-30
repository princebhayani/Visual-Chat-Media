"use client";
import dynamic from "next/dynamic";

// Use the enhanced VideoCallRoom with all improvements integrated
const DynamicVideoCallRoom = dynamic(
	() => import("@/components/video-call/VideoCallRoomEnhanced"),
	{ ssr: false }
);

export default function VideoCall() {
	return <DynamicVideoCallRoom />;
}