'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSocket } from './use-socket';
import { useCallStore } from '@/store/call-store';
import { SOCKET_EVENTS } from '@ai-chat/shared';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useCall() {
  const { socket } = useSocket();
  const {
    activeCall,
    callStatus,
    isMuted,
    isCameraOff,
    callDuration,
    localStream,
    remoteStream,
    setActiveCall,
    setCallStatus,
    toggleMute,
    toggleCamera,
    setCallDuration,
    setLocalStream,
    setRemoteStream,
    resetCall,
  } = useCallStore();

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Start call timer
  const startTimer = useCallback(() => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration(useCallStore.getState().callDuration + 1);
    }, 1000);
  }, [setCallDuration]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Flush queued ICE candidates once remote description is set
  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    const candidates = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error('Error adding queued ICE candidate:', err);
      }
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    // Close existing connection if any
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Clear any pending candidates from previous calls
    pendingCandidatesRef.current = [];

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const currentCall = useCallStore.getState().activeCall;
        if (currentCall) {
          socket.emit(SOCKET_EVENTS.CALL_ICE_CANDIDATE, {
            callId: currentCall.callId,
            candidate: event.candidate,
          });
        }
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0] || null);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, setRemoteStream]);

  // Get local media
  const getLocalMedia = useCallback(
    async (type: 'AUDIO' | 'VIDEO') => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: type === 'VIDEO',
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        return stream;
      } catch (error) {
        console.error('Failed to get media devices:', error);
        return null;
      }
    },
    [setLocalStream],
  );

  // Initiate a call
  const startCall = useCallback(
    async (calleeId: string, conversationId: string, type: 'AUDIO' | 'VIDEO') => {
      if (!socket) return;

      socket.emit(SOCKET_EVENTS.CALL_INITIATE, {
        conversationId,
        calleeId,
        type,
      });

      setCallStatus('ringing');
    },
    [socket, setCallStatus],
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!socket || !activeCall) return;

    setCallStatus('connecting');

    const stream = await getLocalMedia(activeCall.type);
    if (!stream) {
      resetCall();
      return;
    }

    const pc = createPeerConnection();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    socket.emit(SOCKET_EVENTS.CALL_ACCEPT, { callId: activeCall.callId });
  }, [socket, activeCall, getLocalMedia, createPeerConnection, setCallStatus, resetCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!socket || !activeCall) return;
    socket.emit(SOCKET_EVENTS.CALL_REJECT, { callId: activeCall.callId });
    resetCall();
  }, [socket, activeCall, resetCall]);

  // End active call
  const endCall = useCallback(() => {
    if (!socket) return;
    const currentCall = useCallStore.getState().activeCall;
    if (!currentCall) return;

    socket.emit(SOCKET_EVENTS.CALL_END, { callId: currentCall.callId });

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingCandidatesRef.current = [];
    stopTimer();
    resetCall();
  }, [socket, stopTimer, resetCall]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRinging = (data: {
      callId: string;
      callerId: string;
      callerName: string;
      conversationId: string;
      type: 'AUDIO' | 'VIDEO';
    }) => {
      setActiveCall(data);
      setCallStatus('ringing');
    };

    const handleAccepted = async (data: { callId: string }) => {
      const currentCall = useCallStore.getState().activeCall;
      if (!currentCall) return;

      // Validate callId matches our active call
      if (data.callId !== currentCall.callId) return;

      setCallStatus('connecting');

      const stream = await getLocalMedia(currentCall.type);
      if (!stream) {
        resetCall();
        return;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      try {
        // Create and send offer (caller side)
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit(SOCKET_EVENTS.CALL_OFFER, {
          callId: currentCall.callId,
          offer,
        });
      } catch (err) {
        console.error('Error creating offer:', err);
        resetCall();
      }
    };

    const handleRejected = (data: { callId: string }) => {
      const currentCall = useCallStore.getState().activeCall;
      if (currentCall && data.callId !== currentCall.callId) return;

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      pendingCandidatesRef.current = [];
      stopTimer();
      resetCall();
    };

    const handleEnded = (data: { callId: string }) => {
      const currentCall = useCallStore.getState().activeCall;
      if (currentCall && data.callId !== currentCall.callId) return;

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      pendingCandidatesRef.current = [];
      stopTimer();
      resetCall();
    };

    const handleOffer = async (data: { callId: string; offer: unknown }) => {
      const currentCall = useCallStore.getState().activeCall;
      if (!currentCall || data.callId !== currentCall.callId) return;

      const pc = peerConnectionRef.current;
      if (!pc) return;

      // Only accept offers when in stable state
      if (pc.signalingState !== 'stable') {
        console.warn(
          `Ignoring offer: peer connection is in '${pc.signalingState}' state (expected 'stable')`,
        );
        return;
      }

      try {
        await pc.setRemoteDescription(data.offer as RTCSessionDescriptionInit);

        // Flush any ICE candidates that arrived before the offer
        await flushPendingCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit(SOCKET_EVENTS.CALL_ANSWER, {
          callId: data.callId,
          answer,
        });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    const handleAnswer = async (data: { callId: string; answer: unknown }) => {
      const currentCall = useCallStore.getState().activeCall;
      if (!currentCall || data.callId !== currentCall.callId) return;

      const pc = peerConnectionRef.current;
      if (!pc) return;

      // Only accept answers when we have a local offer pending
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(
          `Ignoring answer: peer connection is in '${pc.signalingState}' state (expected 'have-local-offer')`,
        );
        return;
      }

      try {
        await pc.setRemoteDescription(data.answer as RTCSessionDescriptionInit);

        // Flush any ICE candidates that arrived before the answer
        await flushPendingCandidates();

        setCallStatus('active');
        startTimer();
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    };

    const handleICECandidate = async (data: {
      callId: string;
      candidate: unknown;
    }) => {
      const currentCall = useCallStore.getState().activeCall;
      if (!currentCall || data.callId !== currentCall.callId) return;

      const pc = peerConnectionRef.current;
      if (!pc) return;

      const candidate = data.candidate as RTCIceCandidateInit;

      // Queue candidates if remote description hasn't been set yet
      if (!pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    socket.on(SOCKET_EVENTS.CALL_RINGING, handleRinging);
    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, handleAccepted);
    socket.on(SOCKET_EVENTS.CALL_REJECTED, handleRejected);
    socket.on(SOCKET_EVENTS.CALL_ENDED, handleEnded);
    socket.on(SOCKET_EVENTS.CALL_OFFER, handleOffer);
    socket.on(SOCKET_EVENTS.CALL_ANSWER, handleAnswer);
    socket.on(SOCKET_EVENTS.CALL_ICE_CANDIDATE, handleICECandidate);

    return () => {
      socket.off(SOCKET_EVENTS.CALL_RINGING, handleRinging);
      socket.off(SOCKET_EVENTS.CALL_ACCEPTED, handleAccepted);
      socket.off(SOCKET_EVENTS.CALL_REJECTED, handleRejected);
      socket.off(SOCKET_EVENTS.CALL_ENDED, handleEnded);
      socket.off(SOCKET_EVENTS.CALL_OFFER, handleOffer);
      socket.off(SOCKET_EVENTS.CALL_ANSWER, handleAnswer);
      socket.off(SOCKET_EVENTS.CALL_ICE_CANDIDATE, handleICECandidate);
    };
  }, [
    socket,
    setActiveCall,
    setCallStatus,
    getLocalMedia,
    createPeerConnection,
    flushPendingCandidates,
    startTimer,
    stopTimer,
    resetCall,
  ]);

  return {
    activeCall,
    callStatus,
    isMuted,
    isCameraOff,
    callDuration,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
