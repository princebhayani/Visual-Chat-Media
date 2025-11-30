/**
 * Animated Toggle Button
 * 
 * Button with smooth animations for mic/camera toggles
 * Inspired by Google Meet's toggle animations
 */

"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ToggleButtonProps {
	type: "mic" | "camera";
	enabled: boolean;
	onToggle: (enabled: boolean) => void;
	size?: "sm" | "md" | "lg";
	variant?: "default" | "destructive" | "outline";
	className?: string;
	disabled?: boolean;
}

const SIZES = {
	sm: "h-10 w-10",
	md: "h-12 w-12",
	lg: "h-14 w-14",
};

const ICON_SIZES = {
	sm: "h-5 w-5",
	md: "h-6 w-6",
	lg: "h-7 w-7",
};

export function ToggleButton({
	type,
	enabled,
	onToggle,
	size = "md",
	variant = "default",
	className,
	disabled = false,
}: ToggleButtonProps) {
	const [isAnimating, setIsAnimating] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	const handleClick = () => {
		if (disabled) return;
		
		setIsAnimating(true);
		onToggle(!enabled);
		
		setTimeout(() => {
			setIsAnimating(false);
		}, 300);
	};

	const Icon = type === "mic" ? (enabled ? Mic : MicOff) : (enabled ? Video : VideoOff);

	return (
		<Button
			variant={variant === "destructive" && !enabled ? "destructive" : variant}
			size="icon"
			onClick={handleClick}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			disabled={disabled}
			className={cn(
				SIZES[size],
				"relative rounded-full transition-all duration-200",
				"hover:scale-110 active:scale-95",
				isAnimating && "animate-pulse",
				!enabled && type === "mic" && "bg-red-500 hover:bg-red-600",
				!enabled && type === "camera" && "bg-red-500 hover:bg-red-600",
				enabled && "hover:bg-gray-700",
				className
			)}
		>
			{/* Icon with animation */}
			<div
				className={cn(
					"transition-all duration-300",
					isAnimating && "scale-125 rotate-12",
					!enabled && "opacity-75"
				)}
			>
				<Icon className={cn(ICON_SIZES[size], "transition-all duration-200")} />
			</div>

			{/* Ripple effect on click */}
			{isAnimating && (
				<span
					className={cn(
						"absolute inset-0 rounded-full",
						"animate-ping",
						enabled ? "bg-blue-500" : "bg-red-500",
						"opacity-75"
					)}
				/>
			)}

			{/* Tooltip */}
			{isHovered && (
				<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap pointer-events-none">
					{enabled ? `Turn off ${type === "mic" ? "microphone" : "camera"}` : `Turn on ${type === "mic" ? "microphone" : "camera"}`}
				</div>
			)}
		</Button>
	);
}

