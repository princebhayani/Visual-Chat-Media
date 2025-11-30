/**
 * Mobile Layout Component
 * 
 * Optimized layout for mobile devices
 * Stack layout with swipe navigation
 */

"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MobileLayoutProps {
	participants: Array<{
		id: string;
		content: React.ReactNode;
		isActive?: boolean;
	}>;
	className?: string;
}

export function MobileLayout({ participants, className }: MobileLayoutProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [touchStart, setTouchStart] = useState<number | null>(null);
	const [touchEnd, setTouchEnd] = useState<number | null>(null);

	// Swipe detection
	const minSwipeDistance = 50;

	const onTouchStart = (e: React.TouchEvent) => {
		setTouchEnd(null);
		setTouchStart(e.targetTouches[0].clientX);
	};

	const onTouchMove = (e: React.TouchEvent) => {
		setTouchEnd(e.targetTouches[0].clientX);
	};

	const onTouchEnd = () => {
		if (!touchStart || !touchEnd) return;

		const distance = touchStart - touchEnd;
		const isLeftSwipe = distance > minSwipeDistance;
		const isRightSwipe = distance < -minSwipeDistance;

		if (isLeftSwipe && currentIndex < participants.length - 1) {
			setCurrentIndex(currentIndex + 1);
		}
		if (isRightSwipe && currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
		}
	};

	// Keyboard navigation
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft" && currentIndex > 0) {
				setCurrentIndex(currentIndex - 1);
			} else if (e.key === "ArrowRight" && currentIndex < participants.length - 1) {
				setCurrentIndex(currentIndex + 1);
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [currentIndex, participants.length]);

	if (participants.length === 0) return null;

	const currentParticipant = participants[currentIndex];

	return (
		<div
			className={cn("relative h-full w-full overflow-hidden", className)}
			onTouchStart={onTouchStart}
			onTouchMove={onTouchMove}
			onTouchEnd={onTouchEnd}
		>
			{/* Main participant view */}
			<div className="absolute inset-0">
				{currentParticipant.content}
			</div>

			{/* Navigation arrows */}
			{participants.length > 1 && (
				<>
					{currentIndex > 0 && (
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setCurrentIndex(currentIndex - 1)}
							className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
						>
							<ChevronLeft className="h-6 w-6" />
						</Button>
					)}
					{currentIndex < participants.length - 1 && (
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setCurrentIndex(currentIndex + 1)}
							className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
						>
							<ChevronRight className="h-6 w-6" />
						</Button>
					)}
				</>
			)}

			{/* Participant indicator dots */}
			{participants.length > 1 && (
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
					{participants.map((_, index) => (
						<button
							key={index}
							onClick={() => setCurrentIndex(index)}
							className={cn(
								"w-2 h-2 rounded-full transition-all",
								index === currentIndex
									? "bg-white w-6"
									: "bg-white/50 hover:bg-white/75"
							)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

