import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MessageSeenSvg } from "@/lib/svgs";
import { ImageIcon, Users, VideoIcon } from "lucide-react";
import { useConversationStore, type Conversation as ConversationType } from "@/store/chat-store";

type ConversationProps = {
	conversation: ConversationType;
	currentUserFirebaseUid: string;
};

const Conversation = ({ conversation, currentUserFirebaseUid }: ConversationProps) => {
	const { setSelectedConversation, selectedConversation } = useConversationStore();
	const isSelected = selectedConversation?._id === conversation._id;

	const conversationName = conversation.isGroup
		? conversation.groupName ?? "Group chat"
		: conversation.name ?? "Conversation";

	const conversationImage = conversation.isGroup
		? conversation.groupImageUrl
		: conversation.image ?? "/placeholder.png";

	const isOnline = conversation.isGroup ? false : conversation.isOnline;
	const lastMessage = conversation.lastMessage;
	const lastMessageType = lastMessage?.messageType;

	return (
		<>
			<div
				className={`flex gap-2 items-center p-3 hover:bg-chat-hover cursor-pointer ${
					isSelected ? "bg-gray-tertiary" : ""
				}`}
				onClick={() => setSelectedConversation(conversation)}
			>
				<Avatar className='border border-gray-900 overflow-visible relative'>
					{isOnline && (
						<div className='absolute top-0 right-0 w-2.5 h-2.5 bg-pink-500 rounded-full border-2 border-foreground' />
					)}
					<AvatarImage src={conversationImage || "/placeholder.png"} className='object-cover rounded-full' />
					<AvatarFallback>
						<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
					</AvatarFallback>
				</Avatar>
				<div className='w-full'>
					<div className='flex items-center'>
						<h3 className='text-xs lg:text-sm font-medium'>{conversationName}</h3>
						<span className='text-[10px] lg:text-xs text-gray-500 ml-auto'>
							{formatDate(lastMessage?._creationTime ?? new Date(conversation.updatedAt).getTime())}
						</span>
					</div>
					<p className='text-[12px] mt-1 text-gray-500 flex items-center gap-1'>
						{lastMessage?.sender.firebaseUid === currentUserFirebaseUid ? <MessageSeenSvg /> : ""}
						{conversation.isGroup && <Users size={16} />}
						{!lastMessage && "Say Hi!"}
						{lastMessageType === "text" && lastMessage?.content && (
							<span>{lastMessage.content.length > 30 ? `${lastMessage.content.slice(0, 30)}...` : lastMessage.content}</span>
						)}
						{lastMessageType === "image" && <ImageIcon size={16} />}
						{lastMessageType === "video" && <VideoIcon size={16} />}
					</p>
				</div>
			</div>
			<hr className='h-[1px] mx-10 bg-gray-primary' />
		</>
	);
};
export default Conversation;
