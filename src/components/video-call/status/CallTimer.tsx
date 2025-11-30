/**
 * Call Timer Component
 * 
 * Displays call duration in HH:MM:SS format
 * Tracks time from call start to current moment
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CallTimerProps {
	startTime: number; // Timestamp when call started
	paused?: boolean;
	className?: string;
	showIcon?: boolean;
	format?: "short" | "long"; // "00:30" vs "0:00:30"
}

export function CallTimer({
	startTime,
	paused = false,
	className,
	showIcon = true,
	format = "long",
}: CallTimerProps) {
	const [duration, setDuration] = useState(0);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		const updateDuration = () => {
			if (!paused) {
				const now = Date.now();
				const elapsed = Math.floor((now - startTime) / 1000);
				setDuration(elapsed);
			}
		};

		// Update immediately
		updateDuration();

		// Update every second
		intervalRef.current = setInterval(updateDuration, 1000);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [startTime, paused]);

	const formatTime = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (format === "short" && hours === 0) {
			// Short format: MM:SS when less than 1 hour
			return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
		}

		// Long format: HH:MM:SS
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	return (
		<div className={cn("inline-flex items-center gap-2", className)}>
			{showIcon && <Clock className="h-4 w-4 text-gray-400" />}
			<span className="font-mono text-sm font-medium tabular-nums">
				{formatTime(duration)}
			</span>
		</div>
	);
}

