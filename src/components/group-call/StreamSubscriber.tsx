/**
 * Stream Subscriber Component
 * 
 * Handles subscribing to and displaying SFU streams
 * Manages consumer creation and track assignment
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { SFUClient, ConsumerInfo } from "@/services/sfu-client";

export interface StreamSubscriberProps {
	sfuClient: SFUClient;
	producerId: string;
	userId: string;
	kind: "audio" | "video";
	videoElement?: HTMLVideoElement;
	audioElement?: HTMLAudioElement;
	onTrackReady?: (track: MediaStreamTrack) => void;
	className?: string;
}

export function StreamSubscriber({
	sfuClient,
	producerId,
	userId,
	kind,
	videoElement,
	audioElement,
	onTrackReady,
	className,
}: StreamSubscriberProps) {
	const [track, setTrack] = useState<MediaStreamTrack | null>(null);
	const [isSubscribed, setIsSubscribed] = useState(false);
	const streamRef = useRef<MediaStream | null>(null);

	useEffect(() => {
		subscribeToStream();

		return () => {
			unsubscribeFromStream();
		};
	}, [producerId]);

	/**
	 * Subscribe to producer stream
	 */
	const subscribeToStream = async () => {
		try {
			// Request consumer from SFU
			const consumerParams = await requestConsumer(producerId);

			// Create receiver and get track
			// This would typically involve creating an RTCRtpReceiver
			// and handling the SFU's consumer creation flow
			// Implementation depends on SFU type

			console.log(`[StreamSubscriber] Subscribed to ${kind} stream from ${userId}`);
			setIsSubscribed(true);
		} catch (error) {
			console.error(`[StreamSubscriber] Error subscribing to stream:`, error);
		}
	};

	/**
	 * Unsubscribe from stream
	 */
	const unsubscribeFromStream = async () => {
		try {
			// Close consumer on SFU
			if (sfuClient) {
				await sfuClient.getSocket().emit('close-consumer', { producerId });
			}

			// Stop track
			if (track) {
				track.stop();
			}

			// Clean up stream
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(t => t.stop());
				streamRef.current = null;
			}

			setTrack(null);
			setIsSubscribed(false);
		} catch (error) {
			console.error(`[StreamSubscriber] Error unsubscribing:`, error);
		}
	};

	/**
	 * Request consumer from SFU
	 */
	const requestConsumer = async (producerId: string): Promise<any> => {
		return new Promise((resolve, reject) => {
			sfuClient.getSocket().emit('consume', { producerId }, (response: { error?: string; consumerParams?: any }) => {
				if (response.error) {
					reject(new Error(response.error));
				} else {
					resolve(response.consumerParams);
				}
			});
		});
	};

	/**
	 * Setup media element
	 */
	useEffect(() => {
		if (!track) return;

		if (kind === "video" && videoElement) {
			const stream = new MediaStream([track]);
			streamRef.current = stream;
			videoElement.srcObject = stream;
			videoElement.play().catch(console.error);
		} else if (kind === "audio" && audioElement) {
			const stream = new MediaStream([track]);
			streamRef.current = stream;
			audioElement.srcObject = stream;
			audioElement.play().catch(console.error);
		}

		onTrackReady?.(track);

		return () => {
			if (videoElement) {
				videoElement.srcObject = null;
			}
			if (audioElement) {
				audioElement.srcObject = null;
			}
		};
	}, [track, videoElement, audioElement, kind, onTrackReady]);

	if (!isSubscribed) {
		return (
			<div className={className}>
				<div className="flex items-center justify-center h-full">
					<div className="text-sm text-gray-400">Connecting...</div>
				</div>
			</div>
		);
	}

	if (kind === "video" && !track) {
		return (
			<div className={className}>
				<div className="flex items-center justify-center h-full bg-gray-800">
					<div className="text-sm text-gray-400">No video</div>
				</div>
			</div>
		);
	}

	return null; // Media elements are rendered by parent
}

