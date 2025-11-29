import { create } from "zustand";

export type UserProfile = {
	id: string;
	firebaseUid: string;
	email: string;
	name?: string | null;
	avatarUrl?: string | null;
	isOnline: boolean;
};

export interface IMessage {
	_id: string;
	content: string;
	_creationTime: number;
	messageType: "text" | "image" | "video";
	sender: UserProfile;
}

export type Conversation = {
	id: string;
	_id: string;
	isGroup: boolean;
	groupName?: string | null;
	groupImageUrl?: string | null;
	adminId?: string | null;
	image?: string | null;
	name?: string | null;
	participants: string[];
	participantProfiles: UserProfile[];
	isOnline?: boolean;
	lastMessage?: IMessage;
	updatedAt: string;
	createdAt: string;
};

type ConversationStore = {
	selectedConversation: Conversation | null;
	setSelectedConversation: (conversation: Conversation | null) => void;
};

export const useConversationStore = create<ConversationStore>((set) => ({
	selectedConversation: null,
	setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
}));