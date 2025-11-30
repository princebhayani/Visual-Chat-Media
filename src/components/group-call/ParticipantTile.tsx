/**
 * Participant Tile Component
 * 
 * Individual participant tile in group call
 * Handles video/audio display and active speaker indication
 */

"use client";

import { useEffect, useRef } from "react";
import { StreamSubscriber } from "./StreamSubscriber";
import { ActiveSpeakerIndicator } from "@/components/video-call/participants/ActiveSpeakerIndicator";
import { SFUClient } from "@/services/sfu-client";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

export interface Participant {
	userId: string;
	userName?: string;
	audioProducerId?: string;
	videoProducerId?: string;
	isAudioEnabled: boolean;
	isVideoEnabled: boolean;
	isScreenSharing: boolean;
	isActiveSpeaker?: boolean;
}

export interface ParticipantTileProps {
	participant: Participant;
	sfuClient: SFUClient;
	isLocal?: boolean;
	localStream?: MediaStream;
	size?: "small" | "medium" | "large";
	className?: string;
}

export function ParticipantTile({
	participant,
	sfuClient,
	isLocal = false,
	localStream,
	size = "medium",
	className,
}: ParticipantTileProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const audioRef = useRef<HTMLAudioElement>(null);

	// Setup local stream if local participant
	useEffect(() => {
		if (isLocal && localStream && videoRef.current) {
			videoRef.current.srcObject = localStream;
		}
	}, [isLocal, localStream]);

	const sizeClasses = {
		small: "w-32 h-24",
		medium: "w-full h-full",
		large: "w-full h-full",
	};

	return (
		<div
			className={cn(
				"relative rounded-lg overflow-hidden bg-gray-800 aspect-video",
				sizeClasses[size],
				participant.isActiveSpeaker && "ring-4 ring-blue-500",
				className
			)}
		>
			{/* Video */}
			{participant.isVideoEnabled ? (
				isLocal ? (
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						className="w-full h-full object-cover"
					/>
				) : participant.videoProducerId ? (
					<>
						<video
							ref={videoRef}
							autoPlay
							playsInline
							className="w-full h-full object-cover"
						/>
						<StreamSubscriber
							sfuClient={sfuClient}
							producerId={participant.videoProducerId}
							userId={participant.userId}
							kind="video"
							videoElement={videoRef.current || undefined}
						/>
					</>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-gray-800">
						<div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center">
							<span className="text-2xl font-semibold text-white">
								{participant.userName?.charAt(0).toUpperCase() || participant.userId.charAt(0).toUpperCase()}
							</span>
						</div>
					</div>
				)
			) : (
				<div className="w-full h-full flex items-center justify-center bg-gray-800">
					<div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center">
						<span className="text-2xl font-semibold text-white">
							{participant.userName?.charAt(0).toUpperCase() || participant.userId.charAt(0).toUpperCase()}
						</span>
					</div>
				</div>
			)}

			{/* Audio (hidden) */}
			{!isLocal && participant.audioProducerId && (
				<>
					<audio ref={audioRef} autoPlay playsInline />
					<StreamSubscriber
						sfuClient={sfuClient}
						producerId={participant.audioProducerId}
						userId={participant.userId}
						kind="audio"
						audioElement={audioRef.current || undefined}
					/>
				</>
			)}

			{/* Active Speaker Indicator */}
			{participant.isActiveSpeaker && (
				<ActiveSpeakerIndicator isActive={true} animation="pulse" />
			)}

			{/* Overlay Info */}
			<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
				<div className="flex items-center justify-between">
					<span className="text-white text-sm font-medium truncate">
						{participant.userName || participant.userId}
						{isLocal && " (You)"}
					</span>
					<div className="flex items-center gap-1">
						{!participant.isAudioEnabled && (
							<MicOff className="h-4 w-4 text-red-500" />
						)}
						{!participant.isVideoEnabled && (
							<VideoOff className="h-4 w-4 text-red-500" />
						)}
						{participant.isScreenSharing && (
							<span className="text-xs text-blue-400">Sharing</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

