"use client";
import dynamic from "next/dynamic";

const DynamicVideoCallRoom = dynamic(() => import("@/components/video-call/video-call-room"), { ssr: false });

export default function VideoCall() {
	return <DynamicVideoCallRoom />;
}