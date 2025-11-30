/**
 * Draggable Mini-Video Component
 * 
 * Small draggable video window that can be moved around the screen
 * Similar to Discord's draggable video feature
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { X, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DraggableVideoProps {
	videoStream: MediaStream | null;
	title?: string;
	onClose?: () => void;
	className?: string;
	size?: "small" | "medium" | "large";
}

const VIDEO_SIZES = {
	small: { width: 200, height: 150 },
	medium: { width: 320, height: 240 },
	large: { width: 480, height: 360 },
} as const;

export function DraggableVideo({
	videoStream,
	title = "Video",
	onClose,
	className,
	size = "medium",
}: DraggableVideoProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [position, setPosition] = useState({ x: 20, y: 80 });
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const dragStartRef = useRef<{ x: number; y: number } | null>(null);

	useEffect(() => {
		if (videoStream && videoRef.current) {
			videoRef.current.srcObject = videoStream;
			videoRef.current.autoplay = true;
			videoRef.current.playsInline = true;
		}
	}, [videoStream]);

	// Handle drag start
	const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
		if ((e.target as HTMLElement).closest("button")) return;
		
		setIsDragging(true);
		const rect = containerRef.current?.getBoundingClientRect();
		const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
		const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

		if (rect) {
			dragStartRef.current = {
				x: clientX - rect.left,
				y: clientY - rect.top,
			};
		}
	};

	// Handle drag move
	const handleDragMove = (e: MouseEvent | TouchEvent) => {
		if (!isDragging || !dragStartRef.current) return;

		const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
		const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

		const newX = clientX - dragStartRef.current.x;
		const newY = clientY - dragStartRef.current.y;

		// Keep within viewport with snap zones
		const dimensions = VIDEO_SIZES[size];
		const maxX = window.innerWidth - dimensions.width;
		const maxY = window.innerHeight - dimensions.height;

		// Snap to edges
		const snapThreshold = 50;
		let snappedX = Math.max(0, Math.min(newX, maxX));
		let snappedY = Math.max(0, Math.min(newY, maxY));

		// Snap to left edge
		if (snappedX < snapThreshold) {
			snappedX = 0;
		}
		// Snap to right edge
		if (snappedX > maxX - snapThreshold) {
			snappedX = maxX;
		}
		// Snap to top edge
		if (snappedY < snapThreshold) {
			snappedY = 0;
		}
		// Snap to bottom edge
		if (snappedY > maxY - snapThreshold) {
			snappedY = maxY;
		}

		setPosition({ x: snappedX, y: snappedY });
	};

	// Handle drag end
	const handleDragEnd = () => {
		setIsDragging(false);
		dragStartRef.current = null;
	};

	useEffect(() => {
		if (isDragging) {
			window.addEventListener("mousemove", handleDragMove);
			window.addEventListener("mouseup", handleDragEnd);
			window.addEventListener("touchmove", handleDragMove);
			window.addEventListener("touchend", handleDragEnd);
			return () => {
				window.removeEventListener("mousemove", handleDragMove);
				window.removeEventListener("mouseup", handleDragEnd);
				window.removeEventListener("touchmove", handleDragMove);
				window.removeEventListener("touchend", handleDragEnd);
			};
		}
	}, [isDragging]);

	if (!videoStream) return null;

	return (
		<div
			ref={containerRef}
			className={cn(
				"fixed z-[9998] bg-gray-900 rounded-lg shadow-xl overflow-hidden border border-gray-700",
				"transition-all duration-200",
				isDragging && "scale-105 shadow-2xl border-blue-500",
				className
			)}
			style={{
				left: `${position.x}px`,
				top: `${position.y}px`,
				width: `${VIDEO_SIZES[size].width}px`,
				height: `${VIDEO_SIZES[size].height}px`,
				cursor: isDragging ? "grabbing" : "grab",
			}}
			onMouseDown={handleDragStart}
			onTouchStart={handleDragStart}
		>
			{/* Header */}
			<div
				className="flex items-center justify-between px-2 py-1 bg-black/50 backdrop-blur-sm"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className="flex items-center gap-1 text-white text-xs">
					<Move className="h-3 w-3 opacity-50" />
					<span className="truncate">{title}</span>
				</div>
				{onClose && (
					<Button
						variant="ghost"
						size="sm"
						onClick={onClose}
						className="h-5 w-5 p-0 hover:bg-red-500/20"
					>
						<X className="h-3 w-3 text-white" />
					</Button>
				)}
			</div>

			{/* Video */}
			<div className="relative w-full h-[calc(100%-28px)] bg-black">
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					className="w-full h-full object-cover"
				/>
			</div>

			{/* Drag Indicator */}
			{isDragging && (
				<div className="absolute inset-0 border-2 border-blue-400 border-dashed pointer-events-none" />
			)}
		</div>
	);
}

