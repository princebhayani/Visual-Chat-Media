'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface IncomingCallDialogProps {
  callerName: string;
  callType: 'AUDIO' | 'VIDEO';
  isVisible: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallDialog({
  callerName,
  callType,
  isVisible,
  onAccept,
  onReject,
}: IncomingCallDialogProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-card rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
          >
            {/* Ringing animation */}
            <div className="relative mx-auto mb-6 w-24 h-24">
              <motion.div
                className="absolute inset-0 rounded-full bg-green-500/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-2 rounded-full bg-green-500/30"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              />
              <Avatar className="h-24 w-24 mx-auto relative z-10">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  {callerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <h3 className="text-xl font-semibold mb-1">{callerName}</h3>
            <p className="text-sm text-muted-foreground mb-8">
              Incoming {callType === 'VIDEO' ? 'video' : 'audio'} call...
            </p>

            <div className="flex items-center justify-center gap-8">
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full h-16 w-16"
                onClick={onReject}
              >
                <PhoneOff className="h-7 w-7" />
              </Button>

              <Button
                size="lg"
                className="rounded-full h-16 w-16 bg-green-600 hover:bg-green-700 text-white"
                onClick={onAccept}
              >
                {callType === 'VIDEO' ? (
                  <Video className="h-7 w-7" />
                ) : (
                  <Phone className="h-7 w-7" />
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
