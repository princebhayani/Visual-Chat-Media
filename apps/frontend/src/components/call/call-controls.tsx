'use client';

import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CallControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isVideo: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
}

export function CallControls({
  isMuted,
  isCameraOff,
  isVideo,
  onToggleMute,
  onToggleCamera,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        size="lg"
        variant={isMuted ? 'destructive' : 'secondary'}
        className="rounded-full h-14 w-14"
        onClick={onToggleMute}
      >
        {isMuted ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>

      {isVideo && (
        <Button
          size="lg"
          variant={isCameraOff ? 'destructive' : 'secondary'}
          className="rounded-full h-14 w-14"
          onClick={onToggleCamera}
        >
          {isCameraOff ? (
            <VideoOff className="h-6 w-6" />
          ) : (
            <Video className="h-6 w-6" />
          )}
        </Button>
      )}

      <Button
        size="lg"
        variant="destructive"
        className="rounded-full h-14 w-14"
        onClick={onEndCall}
      >
        <PhoneOff className="h-6 w-6" />
      </Button>
    </div>
  );
}
