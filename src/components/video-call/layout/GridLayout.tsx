/**
 * Grid Layout Component
 * 
 * Responsive grid layout for multiple video participants
 * Automatically adjusts grid columns based on participant count
 */

"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GridLayoutProps {
	participants: Array<{
		id: string;
		content: ReactNode;
		isActive?: boolean;
	}>;
	className?: string;
	maxColumns?: number;
	minTileSize?: number;
}

export function GridLayout({
	participants,
	className,
	maxColumns = 3,
	minTileSize = 240,
}: GridLayoutProps) {
	// Calculate grid columns based on participant count
	const getGridCols = (count: number): number => {
		if (count === 1) return 1;
		if (count === 2) return 2;
		if (count === 3 || count === 4) return 2;
		if (count <= 6) return 3;
		if (count <= 9) return 3;
		return Math.min(Math.ceil(Math.sqrt(count)), maxColumns);
	};

	const gridCols = getGridCols(participants.length);
	const gridColsClass = `grid-cols-${gridCols}`;

	// Tailwind doesn't support dynamic class names, so we use inline styles
	const gridStyle = {
		gridTemplateColumns: `repeat(${gridCols}, minmax(${minTileSize}px, 1fr))`,
	};

	return (
		<div
			className={cn(
				"grid gap-4 p-4 h-full w-full",
				className
			)}
			style={gridStyle}
		>
			{participants.map((participant) => (
				<div
					key={participant.id}
					className={cn(
						"relative rounded-lg overflow-hidden bg-gray-800 aspect-video",
						"transition-all duration-200",
						participant.isActive && "ring-4 ring-blue-500 scale-105 z-10"
					)}
				>
					{participant.content}
				</div>
			))}
		</div>
	);
}

