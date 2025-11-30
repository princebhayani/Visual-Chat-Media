/**
 * Picture-in-Picture Component
 * 
 * Floating video window that stays on top of other windows
 * Similar to Google Meet's PiP mode
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PictureInPictureProps {
	videoElement: HTMLVideoElement | null;
	onClose?: () => void;
	onMaximize?: () => void;
	className?: string;
}

const PIP_SIZES = {
	small: { width: 320, height: 240 },
	medium: { width: 480, height: 360 },
	large: { width: 640, height: 480 },
} as const;

type PipSize = keyof typeof PIP_SIZES;

export function PictureInPicture({
	videoElement,
	onClose,
	onMaximize,
	className,
}: PictureInPictureProps) {
	const [size, setSize] = useState<PipSize>("medium");
	const [isDragging, setIsDragging] = useState(false);
	const [position, setPosition] = useState({ x: 20, y: 20 });
	const pipRef = useRef<HTMLDivElement>(null);
	const dragStartRef = useRef<{ x: number; y: number } | null>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (videoElement && videoRef.current) {
			videoRef.current.srcObject = videoElement.srcObject;
			videoRef.current.autoplay = true;
			videoRef.current.playsInline = true;
			videoRef.current.muted = true; // PiP typically shows local video muted
		}
	}, [videoElement]);

	// Handle drag
	const handleMouseDown = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest("button")) return;
		
		setIsDragging(true);
		const rect = pipRef.current?.getBoundingClientRect();
		if (rect) {
			dragStartRef.current = {
				x: e.clientX - rect.left,
				y: e.clientY - rect.top,
			};
		}
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!isDragging || !dragStartRef.current) return;

		const newX = e.clientX - dragStartRef.current.x;
		const newY = e.clientY - dragStartRef.current.y;

		// Keep within viewport
		const maxX = window.innerWidth - PIP_SIZES[size].width;
		const maxY = window.innerHeight - PIP_SIZES[size].height;

		setPosition({
			x: Math.max(0, Math.min(newX, maxX)),
			y: Math.max(0, Math.min(newY, maxY)),
		});
	};

	const handleMouseUp = () => {
		setIsDragging(false);
		dragStartRef.current = null;
	};

	useEffect(() => {
		if (isDragging) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
			return () => {
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isDragging]);

	// Cycle through sizes
	const cycleSize = () => {
		const sizes: PipSize[] = ["small", "medium", "large"];
		const currentIndex = sizes.indexOf(size);
		const nextIndex = (currentIndex + 1) % sizes.length;
		setSize(sizes[nextIndex]);
	};

	if (!videoElement) return null;

	return (
		<div
			ref={pipRef}
			className={cn(
				"fixed z-[9999] bg-gray-900 rounded-lg shadow-2xl overflow-hidden border-2 border-blue-500",
				isDragging && "cursor-grabbing",
				!isDragging && "cursor-grab",
				className
			)}
			style={{
				left: `${position.x}px`,
				top: `${position.y}px`,
				width: `${PIP_SIZES[size].width}px`,
				height: `${PIP_SIZES[size].height}px`,
				transition: isDragging ? "none" : "all 0.3s ease",
			}}
			onMouseDown={handleMouseDown}
		>
			{/* Video */}
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted
				className="w-full h-full object-cover"
			/>

			{/* Controls Overlay */}
			<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200">
				{/* Top Controls */}
				<div className="absolute top-2 right-2 flex gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={cycleSize}
						className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
						title="Resize"
					>
						{size === "large" ? (
							<Minimize2 className="h-4 w-4" />
						) : (
							<Maximize2 className="h-4 w-4" />
						)}
					</Button>
					{onMaximize && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onMaximize}
							className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
							title="Maximize"
						>
							<Maximize2 className="h-4 w-4" />
						</Button>
					)}
					{onClose && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onClose}
							className="h-8 w-8 p-0 bg-red-500/80 hover:bg-red-500 text-white"
							title="Close"
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>

				{/* Bottom Info */}
				<div className="absolute bottom-2 left-2 right-2">
					<div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1 text-white text-xs">
						Picture-in-Picture
					</div>
				</div>
			</div>

			{/* Drag Indicator */}
			{isDragging && (
				<div className="absolute inset-0 border-2 border-blue-400 border-dashed" />
			)}
		</div>
	);
}

