'use client';

import { useCall } from '@/hooks/use-call';
import { useAuthStore } from '@/store/auth-store';
import { IncomingCallDialog } from '@/components/call/incoming-call-dialog';
import { CallView } from '@/components/call/call-view';

export function CallProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useAuthStore((s) => s.user);
  const {
    activeCall,
    callStatus,
    isMuted,
    isCameraOff,
    callDuration,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCall();

  const isIncoming =
    callStatus === 'ringing' && activeCall?.callerId !== currentUser?.id;
  const isInCall = callStatus === 'connecting' || callStatus === 'active';

  return (
    <>
      {children}

      {/* Incoming call dialog */}
      {activeCall && (
        <IncomingCallDialog
          callerName={activeCall.callerName}
          callType={activeCall.type}
          isVisible={isIncoming}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Active call view */}
      {activeCall && (
        <CallView
          callerName={activeCall.callerName}
          callType={activeCall.type}
          callStatus={callStatus}
          callDuration={callDuration}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          localStream={localStream}
          remoteStream={remoteStream}
          isVisible={isInCall}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onEndCall={endCall}
        />
      )}
    </>
  );
}
