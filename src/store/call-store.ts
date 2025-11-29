import { create } from "zustand";

export type CallType = "video" | "audio";

export interface IncomingCall {
	callId: string;
	roomId: string;
	callerId: string;
	callerName?: string;
	callerAvatar?: string;
	conversationId?: string;
	callType?: CallType;
}

type CallStore = {
	incomingCall: IncomingCall | null;
	setIncomingCall: (call: IncomingCall | null) => void;
	activeCall: {
		callId: string;
		roomId: string;
		callType: CallType;
	} | null;
	setActiveCall: (call: { callId: string; roomId: string; callType: CallType } | null) => void;
};

export const useCallStore = create<CallStore>((set) => ({
	incomingCall: null,
	setIncomingCall: (call) => set({ incomingCall: call }),
	activeCall: null,
	setActiveCall: (call) => set({ activeCall: call }),
}));

