/**
 * Video Tile Component
 * 
 * Individual video tile for participants
 * Supports local and remote video, labels, and active speaker indicators
 */

"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { ActiveSpeakerIndicator } from "@/components/video-call/participants/ActiveSpeakerIndicator";
import { cn } from "@/lib/utils";

export interface VideoTileProps {
	videoStream?: MediaStream | null;
	userId: string;
	userName?: string;
	isLocal?: boolean;
	isAudioEnabled?: boolean;
	isVideoEnabled?: boolean;
	isActiveSpeaker?: boolean;
	className?: string;
	showControls?: boolean;
	showLabels?: boolean;
}

export function VideoTile({
	videoStream,
	userId,
	userName,
	isLocal = false,
	isAudioEnabled = true,
	isVideoEnabled = true,
	isActiveSpeaker = false,
	className,
	showControls = true,
	showLabels = true,
}: VideoTileProps) {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (videoRef.current && videoStream) {
			videoRef.current.srcObject = videoStream;
			videoRef.current.autoplay = true;
			videoRef.current.playsInline = true;
			if (isLocal) {
				videoRef.current.muted = true; // Always mute local video
			}
		}
	}, [videoStream, isLocal]);

	return (
		<div
			className={cn(
				"relative w-full h-full bg-gray-900 rounded-lg overflow-hidden",
				"flex items-center justify-center",
				className
			)}
		>
			{/* Video */}
			{isVideoEnabled && videoStream ? (
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted={isLocal}
					className="w-full h-full object-cover"
				/>
			) : (
				<div className="w-full h-full flex items-center justify-center bg-gray-800">
					<div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center">
						<span className="text-2xl font-semibold text-white">
							{userName?.charAt(0).toUpperCase() || userId.charAt(0).toUpperCase()}
						</span>
					</div>
				</div>
			)}

			{/* Active Speaker Indicator */}
			{isActiveSpeaker && (
				<ActiveSpeakerIndicator
					isActive={true}
					animation="pulse"
					showLabel={false}
				/>
			)}

			{/* Overlay Controls */}
			{showControls && (
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
					{/* Bottom Controls */}
					<div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between pointer-events-auto">
						{/* User Name */}
						{showLabels && userName && (
							<div className="flex items-center gap-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-sm truncate max-w-[70%]">
								{userName}
							</div>
						)}

						{/* Audio/Video Status */}
						<div className="flex items-center gap-1">
							{!isAudioEnabled && (
								<div className="p-1 bg-red-500/80 rounded">
									<MicOff className="h-3 w-3 text-white" />
								</div>
							)}
							{!isVideoEnabled && (
								<div className="p-1 bg-red-500/80 rounded">
									<VideoOff className="h-3 w-3 text-white" />
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Corner Label (Always Visible) */}
			{showLabels && userName && (
				<div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-xs font-medium">
					{userName}
				</div>
			)}
		</div>
	);
}

