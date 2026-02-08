import { create } from 'zustand';

export interface CallInfo {
  callId: string;
  callerId: string;
  callerName: string;
  conversationId: string;
  type: 'AUDIO' | 'VIDEO';
}

interface CallState {
  activeCall: CallInfo | null;
  callStatus: 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  setActiveCall: (call: CallInfo | null) => void;
  setCallStatus: (status: CallState['callStatus']) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setCallDuration: (duration: number) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  resetCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  callStatus: 'idle',
  isMuted: false,
  isCameraOff: false,
  callDuration: 0,
  localStream: null,
  remoteStream: null,

  setActiveCall: (call) => set({ activeCall: call }),
  setCallStatus: (callStatus) => set({ callStatus }),
  toggleMute: () =>
    set((state) => {
      if (state.localStream) {
        state.localStream.getAudioTracks().forEach((track) => {
          track.enabled = state.isMuted; // Toggle
        });
      }
      return { isMuted: !state.isMuted };
    }),
  toggleCamera: () =>
    set((state) => {
      if (state.localStream) {
        state.localStream.getVideoTracks().forEach((track) => {
          track.enabled = state.isCameraOff; // Toggle
        });
      }
      return { isCameraOff: !state.isCameraOff };
    }),
  setCallDuration: (callDuration) => set({ callDuration }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  resetCall: () =>
    set((state) => {
      // Clean up streams
      state.localStream?.getTracks().forEach((t) => t.stop());
      state.remoteStream?.getTracks().forEach((t) => t.stop());
      return {
        activeCall: null,
        callStatus: 'idle',
        isMuted: false,
        isCameraOff: false,
        callDuration: 0,
        localStream: null,
        remoteStream: null,
      };
    }),
}));
