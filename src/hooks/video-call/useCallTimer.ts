/**
 * Call Timer Hook
 * 
 * Tracks call duration and provides formatted time
 */

import { useState, useEffect, useRef } from "react";

export interface UseCallTimerReturn {
	duration: number; // Duration in seconds
	formatted: string; // Formatted as HH:MM:SS
	start: () => void;
	pause: () => void;
	resume: () => void;
	reset: () => void;
	isPaused: boolean;
}

export function useCallTimer(): UseCallTimerReturn {
	const [duration, setDuration] = useState(0);
	const [isPaused, setIsPaused] = useState(false);
	const [startTime, setStartTime] = useState<number | null>(null);
	const [pausedDuration, setPausedDuration] = useState(0);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const start = () => {
		if (startTime) return; // Already started
		
		setStartTime(Date.now());
		setIsPaused(false);
		setPausedDuration(0);
	};

	const pause = () => {
		if (!startTime || isPaused) return;
		
		setIsPaused(true);
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}
	};

	const resume = () => {
		if (!startTime || !isPaused) return;
		
		setIsPaused(false);
		// Add paused time to pausedDuration
		setPausedDuration((prev) => prev + Date.now() - (startTime + duration * 1000));
	};

	const reset = () => {
		setDuration(0);
		setStartTime(null);
		setIsPaused(false);
		setPausedDuration(0);
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}
	};

	useEffect(() => {
		if (!startTime || isPaused) {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
			return;
		}

		const updateDuration = () => {
			const now = Date.now();
			const elapsed = Math.floor((now - startTime - pausedDuration) / 1000);
			setDuration(elapsed);
		};

		updateDuration();
		intervalRef.current = setInterval(updateDuration, 1000);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [startTime, isPaused, pausedDuration]);

	const formatTime = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	return {
		duration,
		formatted: formatTime(duration),
		start,
		pause,
		resume,
		reset,
		isPaused,
	};
}

