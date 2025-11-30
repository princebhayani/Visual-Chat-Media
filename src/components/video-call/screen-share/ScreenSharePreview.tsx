/**
 * Screen Share Preview Component
 * 
 * Preview UI before starting screen share
 * Shows what will be shared and options
 */

"use client";

import { useState } from "react";
import { Monitor, Layout, Square, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DisplaySurfaceType = "monitor" | "window" | "browser";

export interface ScreenSharePreviewProps {
	onStart: (options: { audio: boolean; displaySurface?: DisplaySurfaceType }) => void;
	onCancel: () => void;
	className?: string;
}

export function ScreenSharePreview({
	onStart,
	onCancel,
	className,
}: ScreenSharePreviewProps) {
	const [includeAudio, setIncludeAudio] = useState(true);
	const [displaySurface, setDisplaySurface] = useState<DisplaySurfaceType>("monitor");

	return (
		<div
			className={cn(
				"absolute inset-0 z-50 bg-black/80 backdrop-blur-sm",
				"flex items-center justify-center",
				className
			)}
		>
			<div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
				<h3 className="text-xl font-semibold text-white mb-4">
					Share Your Screen
				</h3>

				{/* Options */}
				<div className="space-y-3 mb-6">
					{/* Display Surface Selection */}
					<div>
						<label className="text-sm font-medium text-gray-300 mb-2 block">
							What do you want to share?
						</label>
						<div className="grid grid-cols-3 gap-2">
							{[
								{ value: "monitor" as const, label: "Entire Screen", icon: Monitor },
								{ value: "window" as const, label: "Window", icon: Square },
								{ value: "browser" as const, label: "Browser Tab", icon: Layout },
							].map(({ value, label, icon: Icon }) => (
								<button
									key={value}
									onClick={() => setDisplaySurface(value)}
									className={cn(
										"flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
										displaySurface === value
											? "border-blue-500 bg-blue-500/20"
											: "border-gray-600 hover:border-gray-500"
									)}
								>
									<Icon className="h-6 w-6 text-white" />
									<span className="text-xs text-white">{label}</span>
								</button>
							))}
						</div>
					</div>

					{/* Audio Option */}
					<div className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/50">
						<input
							type="checkbox"
							id="include-audio"
							checked={includeAudio}
							onChange={(e) => setIncludeAudio(e.target.checked)}
							className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
						/>
						<label htmlFor="include-audio" className="text-sm text-white cursor-pointer">
							Share system audio
						</label>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3">
					<Button
						variant="outline"
						onClick={onCancel}
						className="flex-1"
					>
						Cancel
					</Button>
					<Button
						onClick={() => onStart({ audio: includeAudio, displaySurface })}
						className="flex-1 bg-blue-600 hover:bg-blue-700"
					>
						Start Sharing
						<ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}

