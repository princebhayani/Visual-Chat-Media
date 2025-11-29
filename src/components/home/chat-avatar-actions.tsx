import { IMessage, useConversationStore } from "@/store/chat-store";
import { Ban, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import React from "react";
import { authedFetch } from "@/lib/api-client";
import { mapConversation, type BackendConversation } from "@/lib/chat-mappers";

type ChatAvatarActionsProps = {
	message: IMessage;
	me: any;
};

const ChatAvatarActions = ({ me, message }: ChatAvatarActionsProps) => {
	const { selectedConversation, setSelectedConversation } = useConversationStore();

	const isMember = selectedConversation?.participants.includes(message.sender.id);
	const fromAI = message.sender?.name === "ChatGPT";
	const isGroup = selectedConversation?.isGroup;

	const handleKickUser = async (e: React.MouseEvent) => {
		if (fromAI) return;
		e.stopPropagation();
		if (!selectedConversation) return;
		try {
			await authedFetch(`/conversations/${selectedConversation.id}/kick`, {
				method: "POST",
				body: JSON.stringify({
					userId: message.sender.id,
				}),
			});

			setSelectedConversation({
				...selectedConversation,
				participants: selectedConversation.participants.filter((id) => id !== message.sender.id),
				participantProfiles: selectedConversation.participantProfiles.filter((profile) => profile.id !== message.sender.id),
			});
		} catch (error) {
			toast.error("Failed to kick user");
		}
	};

	const handleCreateConversation = async () => {
		if (fromAI) return;
		try {
			const conversation = await authedFetch<BackendConversation>("/conversations", {
				method: "POST",
				body: JSON.stringify({
					isGroup: false,
					participantIds: [message.sender.id],
				}),
			});

			setSelectedConversation(mapConversation(conversation, me?.firebaseUid));
		} catch (error) {
			toast.error("Failed to create conversation");
		}
	};

	return (
		<div
			className='text-[11px] flex gap-4 justify-between font-bold cursor-pointer group'
			onClick={handleCreateConversation}
		>
			{isGroup && message.sender.name}

			{!isMember && !fromAI && isGroup && <Ban size={16} className='text-red-500' />}
			{isGroup && isMember && selectedConversation?.adminId === me?.id && (
				<LogOut size={16} className='text-red-500 opacity-0 group-hover:opacity-100' onClick={handleKickUser} />
			)}
		</div>
	);
};
export default ChatAvatarActions;