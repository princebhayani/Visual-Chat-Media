'use client';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import type { Reaction } from '@ai-chat/shared';

interface ReactionDisplayProps {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
}

export function ReactionDisplay({ reactions, onToggle }: ReactionDisplayProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);

  if (!reactions || reactions.length === 0) return null;

  // Group reactions by emoji
  const grouped = reactions.reduce<Record<string, { count: number; hasMe: boolean }>>(
    (acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { count: 0, hasMe: false };
      }
      acc[r.emoji].count += 1;
      if (r.userId === currentUserId) {
        acc[r.emoji].hasMe = true;
      }
      return acc;
    },
    {},
  );

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, { count, hasMe }]) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(emoji);
          }}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors hover:bg-accent',
            hasMe
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground',
          )}
        >
          <span>{emoji}</span>
          <span className="text-[10px] font-medium">{count}</span>
        </button>
      ))}
    </div>
  );
}
