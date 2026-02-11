'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, truncate } from '@/lib/utils';
import type { Message } from '@ai-chat/shared';

interface ReplyPreviewProps {
  message: Message;
  onDismiss?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

export function ReplyPreview({ message, onDismiss, onClick, compact }: ReplyPreviewProps) {
  const senderName =
    message.type === 'AI_RESPONSE'
      ? 'AI'
      : 'User';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border-l-2 border-primary/60 bg-muted/40 px-3',
        compact ? 'py-1' : 'py-2',
        onClick && 'cursor-pointer hover:bg-muted/60 transition-colors',
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-primary">{senderName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {truncate(message.content, compact ? 40 : 80)}
        </p>
      </div>
      {onDismiss && (
        <Button
          size="icon-sm"
          variant="ghost"
          className="h-5 w-5 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
