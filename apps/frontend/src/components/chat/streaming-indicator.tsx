'use client';

import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function StreamingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-4">
      <Avatar className="h-8 w-8 shrink-0 animate-sparkle">
        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white text-xs">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="rounded-2xl bg-muted/60 backdrop-blur-sm border border-border/30 rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-muted-foreground/50"
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground animate-pulse">
            AI is thinking...
          </span>
        </div>
      </div>
    </div>
  );
}
