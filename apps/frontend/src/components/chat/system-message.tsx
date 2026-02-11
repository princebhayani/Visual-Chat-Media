'use client';

import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import type { Message } from '@ai-chat/shared';

interface SystemMessageProps {
  message: Message;
}

export function SystemMessage({ message }: SystemMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center py-2 px-4"
    >
      <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1">
        <Info className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{message.content}</span>
      </div>
    </motion.div>
  );
}
