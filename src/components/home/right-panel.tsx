"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, Phone, X } from "lucide-react";
import MessageInput from "./message-input";
import MessageContainer from "./message-container";
import ChatPlaceHolder from "@/components/home/chat-placeholder";
import GroupMembersDialog from "./group-members-dialog";
import { useConversationStore } from "@/store/chat-store";
import { useFirebaseAuthContext } from "@/providers/firebase-auth-provider";
import { useSocket } from "@/hooks/useSocket";
import { CallType } from "@/store/call-store";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const RightPanel = () => {
	const { selectedConversation, setSelectedConversation } = useConversationStore();
	const { user, isLoading } = useFirebaseAuthContext();
	const socket = useSocket();

	if (isLoading) return null;
	if (!selectedConversation) return <ChatPlaceHolder />;

	const handleCall = (callType: CallType) => {
		if (!socket || !socket.connected || !user || !selectedConversation) {
			console.error("Cannot initiate call: socket not connected or missing data");
			return;
		}

		// Ensure we're in the room before initiating call
		socket.emit("join-room", selectedConversation.id);
		console.log("📥 Emitted join-room for:", selectedConversation.id);

		// Wait longer to ensure room join is processed on server
		setTimeout(() => {
			const callId = `${selectedConversation.id}-${Date.now()}`;
			
			console.log(`📞 Initiating ${callType} call:`, {
				roomId: selectedConversation.id,
				callerId: user.uid,
				callId,
				callType,
			});
			
			// Emit call initiation with callId and callType
			socket.emit("initiate-call", {
				roomId: selectedConversation.id,
				callerId: user.uid,
				callerName: user.displayName || user.email?.split("@")[0] || "Unknown",
				callerAvatar: user.photoURL || undefined,
				conversationId: selectedConversation.id,
				callId, // Pass the callId to the server
				callType, // Pass the call type
			});

			// Open call window after a longer delay to allow notification to be sent and received
			setTimeout(() => {
				console.log(`🪟 Opening ${callType} call window`);
				window.open(`/video-call?roomID=${selectedConversation.id}&callId=${callId}&callType=${callType}`, "_blank", "width=1200,height=800");
			}, 1000);
		}, 500);
	};

	const conversationName = selectedConversation.isGroup
		? selectedConversation.groupName ?? "Group chat"
		: selectedConversation.name ?? "Conversation";

	const conversationImage = selectedConversation.isGroup
		? selectedConversation.groupImageUrl
		: selectedConversation.image ?? "/placeholder.png";

	return (
		<div className='w-3/4 flex flex-col'>
			<div className='w-full sticky top-0 z-50'>
				<div className='flex justify-between bg-gray-primary p-3'>
					<div className='flex gap-3 items-center'>
						<Avatar>
							<AvatarImage src={conversationImage || "/placeholder.png"} className='object-cover' />
							<AvatarFallback>
								<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full' />
							</AvatarFallback>
						</Avatar>
						<div className='flex flex-col'>
							<p>{conversationName}</p>
							{selectedConversation.isGroup && <GroupMembersDialog selectedConversation={selectedConversation} />}
						</div>
					</div>

					<div className='flex items-center gap-7 mr-5'>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button className='cursor-pointer hover:text-blue-400 transition-colors'>
									<Video size={23} />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end' className='w-48'>
								<DropdownMenuItem onClick={() => handleCall("video")} className='cursor-pointer'>
									<Video size={18} className='mr-2' />
									Video Call
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => handleCall("audio")} className='cursor-pointer'>
									<Phone size={18} className='mr-2' />
									Audio Call
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<X size={16} className='cursor-pointer' onClick={() => setSelectedConversation(null)} />
					</div>
				</div>
			</div>
			<MessageContainer />
			<MessageInput />
		</div>
	);
};
export default RightPanel;