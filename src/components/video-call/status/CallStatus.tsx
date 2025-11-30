/**
 * Call Status Indicator
 * 
 * Shows connection status with animations and color coding
 * States: connecting → connected → unstable → disconnected
 */

"use client";

import { Wifi, WifiOff, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type CallStatusType = "connecting" | "connected" | "unstable" | "disconnected" | "reconnecting";

export interface CallStatusProps {
	status: CallStatusType;
	className?: string;
	showLabel?: boolean;
}

const STATUS_CONFIG = {
	connecting: {
		icon: Loader2,
		color: "text-blue-500",
		bgColor: "bg-blue-500/20",
		borderColor: "border-blue-500",
		label: "Connecting...",
		animated: true,
	},
	connected: {
		icon: CheckCircle2,
		color: "text-green-500",
		bgColor: "bg-green-500/20",
		borderColor: "border-green-500",
		label: "Connected",
		animated: false,
	},
	unstable: {
		icon: AlertCircle,
		color: "text-yellow-500",
		bgColor: "bg-yellow-500/20",
		borderColor: "border-yellow-500",
		label: "Unstable connection",
		animated: true,
	},
	disconnected: {
		icon: WifiOff,
		color: "text-red-500",
		bgColor: "bg-red-500/20",
		borderColor: "border-red-500",
		label: "Disconnected",
		animated: false,
	},
	reconnecting: {
		icon: Loader2,
		color: "text-orange-500",
		bgColor: "bg-orange-500/20",
		borderColor: "border-orange-500",
		label: "Reconnecting...",
		animated: true,
	},
} as const;

export function CallStatus({ status, className, showLabel = true }: CallStatusProps) {
	const config = STATUS_CONFIG[status];
	const Icon = config.icon;

	return (
		<div
			className={cn(
				"inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
				"border backdrop-blur-sm",
				config.bgColor,
				config.borderColor,
				config.color,
				className
			)}
		>
			<Icon
				className={cn(
					"h-4 w-4",
					config.animated && "animate-spin"
				)}
			/>
			{showLabel && (
				<span className="text-sm font-medium">{config.label}</span>
			)}
		</div>
	);
}

/**
 * Connection Quality Indicator
 * Shows signal strength bars similar to phone signal indicators
 */
export function ConnectionQuality({ quality }: { quality: "excellent" | "good" | "fair" | "poor" }) {
	const bars = {
		excellent: 4,
		good: 3,
		fair: 2,
		poor: 1,
	}[quality];

	const colors = {
		excellent: "bg-green-500",
		good: "bg-blue-500",
		fair: "bg-yellow-500",
		poor: "bg-red-500",
	}[quality];

	return (
		<div className="flex items-end gap-0.5 h-4">
			{[1, 2, 3, 4].map((bar) => (
				<div
					key={bar}
					className={cn(
						"w-1 rounded-t transition-all duration-200",
						bar <= bars ? colors : "bg-gray-400/30",
						bar === 1 && "h-1",
						bar === 2 && "h-2",
						bar === 3 && "h-3",
						bar === 4 && "h-4"
					)}
				/>
			))}
		</div>
	);
}

