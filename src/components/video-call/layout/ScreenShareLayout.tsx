/**
 * Screen Share Layout Component
 * 
 * Special layout when someone is sharing their screen
 * Shows screen share prominently with other participants as thumbnails
 */

"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ScreenShareLayoutProps {
	screenShareContent: ReactNode; // The screen share video/content
	participants: Array<{
		id: string;
		content: ReactNode;
	}>;
	onParticipantClick?: (id: string) => void;
	className?: string;
}

export function ScreenShareLayout({
	screenShareContent,
	participants,
	onParticipantClick,
	className,
}: ScreenShareLayoutProps) {
	return (
		<div
			className={cn(
				"flex flex-col h-full bg-gray-900",
				className
			)}
		>
			{/* Main screen share area */}
			<div className="flex-1 relative bg-black overflow-hidden">
				{screenShareContent}
			</div>

			{/* Participant thumbnails */}
			{participants.length > 0 && (
				<div className="p-4 bg-gray-800 border-t border-gray-700">
					<div className="flex gap-3 justify-center flex-wrap max-h-32 overflow-y-auto">
						{participants.map((participant) => (
							<button
								key={participant.id}
								onClick={() => onParticipantClick?.(participant.id)}
								className="relative w-24 h-16 rounded-lg overflow-hidden bg-gray-700 hover:ring-2 hover:ring-blue-500 transition-all hover:scale-105"
							>
								{participant.content}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

