/**
 * Participant Grid Component
 * 
 * Grid layout for multiple participants in group call
 * Adapts layout based on number of participants
 */

"use client";

import { ParticipantTile, Participant } from "./ParticipantTile";
import { SFUClient } from "@/services/sfu-client";
import { cn } from "@/lib/utils";

export interface ParticipantGridProps {
	participants: Participant[];
	sfuClient: SFUClient;
	localParticipant?: Participant;
	localStream?: MediaStream;
	activeSpeakerId?: string;
	className?: string;
}

export function ParticipantGrid({
	participants,
	sfuClient,
	localParticipant,
	localStream,
	activeSpeakerId,
	className,
}: ParticipantGridProps) {
	// Mark active speaker
	const participantsWithActive = participants.map(p => ({
		...p,
		isActiveSpeaker: p.userId === activeSpeakerId,
	}));

	// Calculate grid layout
	const count = participantsWithActive.length;
	const gridCols = getGridColumns(count);
	const gridRows = Math.ceil(count / gridCols);

	return (
		<div
			className={cn(
				"grid gap-4 p-4 h-full w-full",
				`grid-cols-${gridCols}`,
				className
			)}
			style={{
				gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
			}}
		>
			{participantsWithActive.map((participant) => (
				<ParticipantTile
					key={participant.userId}
					participant={participant}
					sfuClient={sfuClient}
					isLocal={participant.userId === localParticipant?.userId}
					localStream={localStream}
				/>
			))}
		</div>
	);
}

/**
 * Calculate optimal grid columns based on participant count
 */
function getGridColumns(count: number): number {
	if (count <= 1) return 1;
	if (count === 2) return 2;
	if (count <= 4) return 2;
	if (count <= 6) return 3;
	if (count <= 9) return 3;
	if (count <= 12) return 4;
	return 4; // Max 4 columns
}

