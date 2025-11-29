"use client";

import { useEffect } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallStore } from "@/store/call-store";
import { useSocket } from "@/hooks/useSocket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CallNotification() {
	const { incomingCall, setIncomingCall } = useCallStore();
	const socket = useSocket();

	useEffect(() => {
		console.log("📞 CallNotification - incomingCall state changed:", incomingCall);
	}, [incomingCall]);

	useEffect(() => {
		if (!incomingCall) return;

		console.log("⏰ Setting 30s timeout for call notification");
		// Auto-dismiss after 30 seconds if not answered
		const timeout = setTimeout(() => {
			console.log("⏰ 30s timeout reached, auto-declining call");
			declineCall();
		}, 30000);

		return () => {
			console.log("🧹 Clearing timeout");
			clearTimeout(timeout);
		};
	}, [incomingCall]);

	if (!incomingCall) {
		console.log("📞 CallNotification - No incoming call, not rendering");
		return null;
	}

	console.log("📞 CallNotification - Rendering notification for:", incomingCall);

	const acceptCall = () => {
		if (socket && incomingCall) {
			socket.emit("call-accepted", {
				callId: incomingCall.callId,
				roomId: incomingCall.roomId,
			});

			// Open call window with callId and callType
			const callType = incomingCall.callType || "video";
			window.open(`/video-call?roomID=${incomingCall.roomId}&callId=${incomingCall.callId}&callType=${callType}`, "_blank", "width=1200,height=800");
			setIncomingCall(null);
		}
	};

	const declineCall = () => {
		if (socket && incomingCall) {
			socket.emit("call-declined", {
				callId: incomingCall.callId,
				roomId: incomingCall.roomId,
			});
			setIncomingCall(null);
		}
	};

	const isAudioCall = incomingCall.callType === "audio";
	const callTypeColor = isAudioCall ? "bg-blue-500" : "bg-green-500";
	const ringColor = isAudioCall ? "ring-blue-500/50" : "ring-green-500/50";

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
			<div className='bg-gray-primary rounded-2xl p-8 shadow-2xl border border-gray-700 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200'>
				<div className='flex flex-col items-center gap-6'>
					<div className='relative'>
						<Avatar className={`w-24 h-24 ring-4 ring-offset-2 ring-offset-gray-900 ${ringColor}`}>
							<AvatarImage src={incomingCall.callerAvatar} />
							<AvatarFallback className='text-2xl'>
								{incomingCall.callerName?.charAt(0).toUpperCase() || "U"}
							</AvatarFallback>
						</Avatar>
						<div className={`absolute -bottom-2 -right-2 ${callTypeColor} rounded-full p-2 animate-pulse shadow-lg`}>
							{isAudioCall ? (
								<Phone className='h-4 w-4 text-white' />
							) : (
								<Video className='h-4 w-4 text-white' />
							)}
						</div>
					</div>

					<div className='text-center'>
						<div className='flex items-center justify-center gap-2 mb-2'>
							{isAudioCall ? (
								<Phone className='h-5 w-5 text-blue-400' />
							) : (
								<Video className='h-5 w-5 text-green-400' />
							)}
							<h3 className='text-xl font-semibold text-white'>
								Incoming {isAudioCall ? "Voice" : "Video"} Call
							</h3>
						</div>
						<p className='text-gray-400 text-lg'>{incomingCall.callerName || "Unknown User"}</p>
						{isAudioCall && (
							<p className='text-sm text-gray-500 mt-1'>Audio only</p>
						)}
					</div>

					<div className='flex gap-4 w-full'>
						<Button
							variant='destructive'
							size='lg'
							onClick={declineCall}
							className='flex-1 rounded-full h-14'
						>
							<PhoneOff className='h-5 w-5 mr-2' />
							Decline
						</Button>
						<Button
							variant='default'
							size='lg'
							onClick={acceptCall}
							className={`flex-1 rounded-full h-14 ${isAudioCall ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}`}
						>
							{isAudioCall ? (
								<Phone className='h-5 w-5 mr-2' />
							) : (
								<Video className='h-5 w-5 mr-2' />
							)}
							Accept
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

