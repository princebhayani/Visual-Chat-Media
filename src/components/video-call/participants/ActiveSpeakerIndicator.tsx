/**
 * Active Speaker Indicator
 * 
 * Highlights the participant who is currently speaking
 * Shows animated border and optional label
 */

"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveSpeakerIndicatorProps {
	isActive: boolean;
	className?: string;
	showLabel?: boolean;
	animation?: "pulse" | "glow" | "border";
}

export function ActiveSpeakerIndicator({
	isActive,
	className,
	showLabel = true,
	animation = "pulse",
}: ActiveSpeakerIndicatorProps) {
	const [isVisible, setIsVisible] = useState(isActive);

	useEffect(() => {
		if (isActive) {
			setIsVisible(true);
		} else {
			// Delay hiding for smooth transition
			const timer = setTimeout(() => setIsVisible(false), 300);
			return () => clearTimeout(timer);
		}
	}, [isActive]);

	if (!isVisible) return null;

	const animations = {
		pulse: "animate-pulse",
		glow: "shadow-lg shadow-blue-500/50",
		border: "ring-4 ring-blue-500 ring-offset-2",
	};

	return (
		<div
			className={cn(
				"absolute inset-0 rounded-lg pointer-events-none transition-all duration-300",
				animations[animation],
				isActive ? "opacity-100" : "opacity-0",
				className
			)}
		>
			{/* Border highlight */}
			<div
				className={cn(
					"absolute inset-0 rounded-lg border-2 border-blue-500",
					animation === "pulse" && "animate-pulse"
				)}
			/>

			{/* Label */}
			{showLabel && (
				<div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-blue-500/90 backdrop-blur-sm rounded text-white text-xs font-medium">
					<Volume2 className="h-3 w-3 animate-pulse" />
					<span>Speaking</span>
				</div>
			)}
		</div>
	);
}

