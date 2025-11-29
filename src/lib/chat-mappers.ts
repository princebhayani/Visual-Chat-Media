import type { Conversation, IMessage, UserProfile } from "@/store/chat-store";

export type BackendUser = {
	id: string;
	firebaseUid: string;
	email: string;
	name?: string | null;
	avatarUrl?: string | null;
	isOnline: boolean;
};

export type BackendMessage = {
	id: string;
	conversationId: string;
	content: string;
	messageType: "TEXT" | "IMAGE" | "VIDEO" | "text" | "image" | "video";
	createdAt: string;
	sender: BackendUser;
};

export type BackendConversation = {
	id: string;
	isGroup: boolean;
	groupName?: string | null;
	groupImageUrl?: string | null;
	adminId?: string | null;
	participants: {
		id: string;
		userId: string;
		user: BackendUser;
	}[];
	lastMessage?: BackendMessage | null;
	updatedAt: string;
	createdAt: string;
};

export function mapMessage(message: BackendMessage): IMessage {
	return {
		_id: message.id,
		content: message.content,
		messageType: message.messageType.toLowerCase() as "text" | "image" | "video",
		_creationTime: new Date(message.createdAt).getTime(),
		sender: mapUserProfile(message.sender),
	};
}

export function mapConversation(
	conversation: BackendConversation,
	currentUserFirebaseUid?: string
): Conversation {
	const participantProfiles = conversation.participants.map((participant) => mapUserProfile(participant.user));
	const participants = participantProfiles.map((profile) => profile.id);

	const otherParticipant = !conversation.isGroup
		? participantProfiles.find((profile) => profile.firebaseUid !== currentUserFirebaseUid)
		: null;

	return {
		id: conversation.id,
		_id: conversation.id,
		isGroup: conversation.isGroup,
		groupName: conversation.groupName ?? undefined,
		groupImageUrl: conversation.groupImageUrl ?? undefined,
		adminId: conversation.adminId ?? undefined,
		image: conversation.isGroup ? conversation.groupImageUrl ?? null : otherParticipant?.avatarUrl ?? null,
		name: conversation.isGroup
			? conversation.groupName ?? "Group chat"
			: otherParticipant?.name ?? otherParticipant?.email ?? "Conversation",
		participants,
		participantProfiles,
		isOnline: conversation.isGroup ? undefined : otherParticipant?.isOnline,
		lastMessage: conversation.lastMessage ? mapMessage(conversation.lastMessage) : undefined,
		updatedAt: conversation.updatedAt,
		createdAt: conversation.createdAt,
	};
}

function mapUserProfile(user: BackendUser): UserProfile {
	return {
		id: user.id,
		firebaseUid: user.firebaseUid,
		email: user.email,
		name: user.name ?? undefined,
		avatarUrl: user.avatarUrl ?? undefined,
		isOnline: user.isOnline,
	};
}

