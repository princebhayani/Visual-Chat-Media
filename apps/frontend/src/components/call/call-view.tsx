'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CallControls } from './call-controls';
import { CallTimer } from './call-timer';

interface CallViewProps {
  callerName: string;
  callType: 'AUDIO' | 'VIDEO';
  callStatus: string;
  callDuration: number;
  isMuted: boolean;
  isCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVisible: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
}

export function CallView({
  callerName,
  callType,
  callStatus,
  callDuration,
  isMuted,
  isCameraOff,
  localStream,
  remoteStream,
  isVisible,
  onToggleMute,
  onToggleCamera,
  onEndCall,
}: CallViewProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col bg-gray-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{callerName}</h3>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  {callStatus === 'connecting' && 'Connecting...'}
                  {callStatus === 'ringing' && 'Ringing...'}
                  {callStatus === 'active' && <CallTimer duration={callDuration} />}
                </div>
              </div>
            </div>
          </div>

          {/* Video / Avatar area */}
          <div className="flex-1 flex items-center justify-center relative">
            {callType === 'VIDEO' && remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32">
                  <AvatarFallback className="text-5xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    {callerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-white/60 text-lg">
                  {callStatus === 'active' ? 'In call' : 'Connecting...'}
                </p>
              </div>
            )}

            {/* Local video (picture-in-picture) */}
            {callType === 'VIDEO' && localStream && (
              <div className="absolute bottom-24 right-4 w-36 h-48 rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-6">
            <CallControls
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              isVideo={callType === 'VIDEO'}
              onToggleMute={onToggleMute}
              onToggleCamera={onToggleCamera}
              onEndCall={onEndCall}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
