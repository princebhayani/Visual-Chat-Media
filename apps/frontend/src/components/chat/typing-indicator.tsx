'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  typingUsers: { userId: string; userName: string }[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0].userName || 'Someone'} is typing`
      : typingUsers.length === 2
        ? `${typingUsers[0].userName || 'Someone'} and ${typingUsers[1].userName || 'someone'} are typing`
        : `${typingUsers.length} people are typing`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground"
      >
        <div className="flex gap-0.5">
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
          />
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
          />
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
          />
        </div>
        <span>{text}</span>
      </motion.div>
    </AnimatePresence>
  );
}
