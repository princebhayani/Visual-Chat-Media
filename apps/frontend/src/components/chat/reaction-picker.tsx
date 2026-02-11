'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function ReactionPicker({ onSelect, className }: ReactionPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4 }}
      className={cn(
        'flex items-center gap-0.5 rounded-full border bg-background/95 backdrop-blur-sm px-1.5 py-0.5 shadow-lg',
        className,
      )}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(emoji);
          }}
          className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-sm hover:scale-125 active:scale-95 transition-transform"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}
