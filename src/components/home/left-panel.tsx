"use client";

import { ListFilter, Search } from "lucide-react";
import { Input } from "../ui/input";
import ThemeSwitch from "./theme-switch";
import Conversation from "./conversation";
import UserListDialog from "./user-list-dialog";
import { useEffect } from "react";
import { useConversationStore } from "@/store/chat-store";
import UserMenu from "@/components/auth/user-menu";
import { useFirebaseAuthContext } from "@/providers/firebase-auth-provider";
import { useAuthedSWR } from "@/hooks/useAuthedSWR";
import { mapConversation, type BackendConversation } from "@/lib/chat-mappers";
import { useMemo } from "react";

const LeftPanel = () => {
	const { user, isLoading } = useFirebaseAuthContext();
	const { data: rawConversations } = useAuthedSWR<BackendConversation[]>(user ? "/conversations" : null);
	const { data: me } = useAuthedSWR(user ? "/users/me" : null);

	const conversations = useMemo(
		() => rawConversations?.map((conversation) => mapConversation(conversation, user?.uid)),
		[rawConversations, user?.uid]
	);

	const { selectedConversation, setSelectedConversation } = useConversationStore();

	useEffect(() => {
		const conversationIds = conversations?.map((conversation) => conversation.id);
		if (selectedConversation && conversationIds && !conversationIds.includes(selectedConversation.id)) {
			setSelectedConversation(null);
		}
	}, [conversations, selectedConversation, setSelectedConversation]);

	if (isLoading) return null;

	return (
		<div className='w-1/4 border-gray-600 border-r'>
			<div className='sticky top-0 bg-left-panel z-10'>
				{/* Header */}
				<div className='flex justify-between bg-gray-primary p-3 items-center'>
					<UserMenu />
					<div className='flex items-center gap-3'>
						{user && <UserListDialog currentUser={me} />}
						<ThemeSwitch />
					</div>
				</div>
				<div className='p-3 flex items-center'>
					<div className='relative h-10 mx-3 flex-1'>
						<Search
							className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10'
							size={18}
						/>
						<Input
							type='text'
							placeholder='Search or start a new chat'
							className='pl-10 py-2 text-sm w-full rounded shadow-sm bg-gray-primary focus-visible:ring-transparent'
						/>
					</div>
					<ListFilter className='cursor-pointer' />
				</div>
			</div>

			<div className='my-3 flex flex-col gap-0 max-h-[80%] overflow-auto'>
				{conversations?.map((conversation) => (
					<Conversation key={conversation.id} conversation={conversation} currentUserFirebaseUid={user?.uid ?? ""} />
				))}
				{conversations && conversations.length === 0 && (
					<>
						<p className='text-center text-gray-500 text-sm mt-3'>No conversations yet</p>
						<p className='text-center text-gray-500 text-sm mt-3 '>
							We understand {"you're"} an introvert, but {"you've"} got to start somewhere 😊
						</p>
					</>
				)}
			</div>
		</div>
	);
};
export default LeftPanel;