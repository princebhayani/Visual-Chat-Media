import ChatBubble from "./chat-bubble";
import { useConversationStore, type IMessage } from "@/store/chat-store";
import { useEffect, useMemo, useRef } from "react";
import { useAuthedSWR } from "@/hooks/useAuthedSWR";
import { mapMessage, type BackendMessage } from "@/lib/chat-mappers";
import { useFirebaseAuthContext } from "@/providers/firebase-auth-provider";

const MessageContainer = () => {
	const { selectedConversation } = useConversationStore();
	const { user } = useFirebaseAuthContext();
	const { data: rawMessages } = useAuthedSWR<BackendMessage[]>(
		selectedConversation ? `/messages/${selectedConversation.id}` : null
	);
	const { data: me } = useAuthedSWR(user ? "/users/me" : null);

	const messages: IMessage[] = useMemo(() => rawMessages?.map(mapMessage) ?? [], [rawMessages]);
	const lastMessageRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setTimeout(() => {
			lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 100);
	}, [messages]);

	return (
		<div className='relative p-3 flex-1 overflow-auto h-full bg-chat-tile-light dark:bg-chat-tile-dark'>
			<div className='mx-12 flex flex-col gap-3'>
				{messages.map((msg, idx) => (
					<div key={msg._id} ref={lastMessageRef} className='flex flex-col'>
						<ChatBubble message={msg} me={me} previousMessage={idx > 0 ? messages[idx - 1] : undefined} />
					</div>
				))}
			</div>
		</div>
	);
};
export default MessageContainer;
