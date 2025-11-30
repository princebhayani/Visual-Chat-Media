/**
 * Ringing Animation Component
 * 
 * Visual indicator for incoming/outgoing calls
 * Animated rings that pulse outward
 */

"use client";

import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RingingIndicatorProps {
	variant?: "incoming" | "outgoing";
	className?: string;
	size?: "sm" | "md" | "lg";
}

export function RingingIndicator({
	variant = "incoming",
	className,
	size = "md",
}: RingingIndicatorProps) {
	const sizes = {
		sm: "h-16 w-16",
		md: "h-24 w-24",
		lg: "h-32 w-32",
	};

	const iconSizes = {
		sm: "h-6 w-6",
		md: "h-8 w-8",
		lg: "h-10 w-10",
	};

	const colors = variant === "incoming" ? "text-green-500" : "text-blue-500";

	return (
		<div className={cn("relative flex items-center justify-center", sizes[size], className)}>
			{/* Animated rings */}
			{[1, 2, 3].map((ring) => (
				<div
					key={ring}
					className={cn(
						"absolute inset-0 rounded-full border-2",
						variant === "incoming" ? "border-green-500" : "border-blue-500",
						"animate-ping"
					)}
					style={{
						animationDelay: `${ring * 0.5}s`,
						animationDuration: "2s",
					}}
				/>
			))}

			{/* Icon */}
			<div
				className={cn(
					"relative z-10 rounded-full bg-white shadow-lg",
					"flex items-center justify-center",
					sizes[size]
				)}
			>
				<Phone className={cn(iconSizes[size], colors)} />
			</div>
		</div>
	);
}

